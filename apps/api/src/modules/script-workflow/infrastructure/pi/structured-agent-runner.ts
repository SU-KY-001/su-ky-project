import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  DefaultResourceLoader,
  SessionManager,
  SettingsManager,
  createAgentSession,
} from "@earendil-works/pi-coding-agent";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../../../core/env";
import { logger } from "../../../../core/logger";
import { MAX_AGENT_RETRY_COUNT } from "../../script-workflow.constants";
import { AgentValidationError } from "../../domain/step-agent";
import { piRuntime } from "./pi-runtime";
import { attachPiTracer, type LogWorkflowEvent } from "./pi-tracer";
import { buildSchemaRetryPrompt } from "../prompts/schema-retry.prompt";

export interface AgentTextBlock {
  type?: string;
  text?: string;
}

export interface AgentMessage {
  role?: string;
  content?: string | AgentTextBlock[];
}

function readTextOfBlock(block: unknown): string {
  if (!block || typeof block !== "object") return "";
  if (!("text" in block)) return "";
  return typeof block.text === "string" ? block.text : "";
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(readTextOfBlock).join("\n");
  }
  return "";
}

function readRoleOf(message: unknown): string | undefined {
  if (!message || typeof message !== "object") return undefined;
  if (!("role" in message)) return undefined;
  return typeof message.role === "string" ? message.role : undefined;
}

function readContentOf(message: unknown): string | AgentTextBlock[] | undefined {
  if (!message || typeof message !== "object") return undefined;
  if (!("content" in message)) return undefined;
  const content = (message as AgentMessage).content;
  if (typeof content === "string" || Array.isArray(content)) {
    return content;
  }
  return undefined;
}

function getAssistantText(messages: unknown[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && typeof m === "object" && readRoleOf(m) === "assistant") {
      return extractText(readContentOf(m));
    }
  }
  return "";
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

/**
 * Chỉ RESEARCHER cần web; các bước còn lại chạy noTools để không thể tự bịa nguồn.
 * Đường dẫn tuyệt đối tới package pi-web-access đã cài (sdk.d.ts: `additionalExtensionPaths`
 * là local path, nên phải resolve thủ công); `PI_WEB_ACCESS_DIR` cho phép ghi đè.
 */
export function resolveWebAccessDir(): string {
  return (
    env.PI_WEB_ACCESS_DIR ??
    path.dirname(fileURLToPath(import.meta.resolve("pi-web-access/package.json")))
  );
}

const WEB_TOOL_NAMES = ["web_search", "fetch_content", "get_search_content", "source_check"];

export interface AgentRunOptions {
  workflowRunId?: number;
  stepType?: string;
  toolPolicy?: "WEB" | "NONE";
  logEvent?: LogWorkflowEvent;
}

/**
 * Why: backend owns schema enforcement. Pi is an LLM harness only —
 * parse + Zod.validate here, retry once with validation errors, then fail.
 * Every run is traced: session events stream into pino + workflow_events via
 * attachPiTracer, with a per-attempt summary logged at completion.
 */
export async function runStructuredAgent<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  options: AgentRunOptions = {}
): Promise<T> {
  if (!piRuntime.modelRuntime || !piRuntime.model) {
    throw new Error("Pi model runtime is not ready");
  }
  const agentLog = logger.child({
    scope: "agent",
    workflowRunId: options.workflowRunId ?? null,
    step: options.stepType ?? "unknown",
    model: piRuntime.model.id,
  });
  const liveModel = piRuntime.modelRuntime.getModel(env.PI_PROVIDER, piRuntime.model.id);
  if (!liveModel) throw new Error(`Model ${piRuntime.model.id} is no longer available`);

  // Minimal resource surface: no skills, no extensions, no context files.
  const settingsManager = SettingsManager.inMemory();
  settingsManager.setDefaultThinkingLevel(env.PI_THINKING_LEVEL);

  const jsonSchema = zodToJsonSchema(schema, { target: "openAi" });
  delete (jsonSchema as Record<string, unknown>)["$schema"];
  const jsonSchemaStr = JSON.stringify(jsonSchema, null, 2);

  const fullSystemPrompt = `${systemPrompt}\n\n<response_format>\nYou MUST respond with valid JSON matching the schema below. Do not include any markdown fences or conversational text outside the JSON.\n<schema>\n${jsonSchemaStr}\n</schema>\n</response_format>`;

  const useWebTools = options.toolPolicy === "WEB";

  const resourceLoader = new DefaultResourceLoader({
    cwd: process.cwd(),
    agentDir: process.cwd(),
    settingsManager,
    noExtensions: true,
    // noExtensions tắt dò tự động nhưng vẫn giữ additionalExtensionPaths:
    // chỉ pi-web-access được nạp, không có skill/MCP/tool nào khác.
    additionalExtensionPaths: useWebTools ? [resolveWebAccessDir()] : [],
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
    systemPrompt: fullSystemPrompt,
  });
  await resourceLoader.reload();

  const sessionOptions: Parameters<typeof createAgentSession>[0] = {
    model: liveModel,
    modelRuntime: piRuntime.modelRuntime,
    sessionManager: SessionManager.inMemory(),
    settingsManager,
    resourceLoader,
    thinkingLevel: env.PI_THINKING_LEVEL,
  };
  if (useWebTools) {
    // Allowlist là bộ lọc cứng trên registry: mọi tool khác bị loại bỏ.
    sessionOptions.tools = [...WEB_TOOL_NAMES];
  } else {
    sessionOptions.tools = [];
    sessionOptions.noTools = "all";
  }

  const { session } = await createAgentSession(sessionOptions);

  // Pi observability: subscribe BEFORE first prompt so no turn/message/tool
  // event is missed; detach in finally. Trace rows land in workflow_events as
  // pi.<step>.<turn|message|tool>.* — replayable per workflow after the run.
  const tracer =
    options.workflowRunId != null && options.stepType && options.logEvent
      ? attachPiTracer(
          session.subscribe.bind(session),
          {
            workflowRunId: options.workflowRunId,
            stepType: options.stepType,
            attempt: 0,
          },
          options.logEvent
        )
      : null;
  const runStartedAt = Date.now();
  agentLog.info(
    {
      systemPromptLength: fullSystemPrompt.length,
      userPromptLength: userPrompt.length,
      userPromptSnippet: userPrompt.slice(0, 500),
    },
    "agent run started"
  );

  try {
    await session.prompt(userPrompt);
    let raw = getAssistantText(session.messages as unknown[]);

    for (let attempt = 0; attempt <= MAX_AGENT_RETRY_COUNT; attempt++) {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(extractJson(raw));
      } catch {
        agentLog.warn({ attempt, rawSnippet: raw.slice(0, 500) }, "agent returned invalid JSON");
        if (attempt >= MAX_AGENT_RETRY_COUNT) {
          throw new AgentValidationError("Agent returned invalid JSON", "Response is not valid JSON");
        }
        await session.prompt(buildSchemaRetryPrompt("Response is not valid JSON", jsonSchemaStr));
        raw = getAssistantText(session.messages as unknown[]);
        continue;
      }
      const validated = schema.safeParse(parsedJson);
      if (validated.success) {
        const summary = tracer?.summary();
        agentLog.info(
          {
            attempt,
            durationMs: Date.now() - runStartedAt,
            outputSnippet: raw.slice(0, 500),
            piTurns: summary?.turnCount ?? null,
            piEvents: summary?.eventCount ?? null,
            piTokenApprox: summary?.tokenApprox ?? null,
            piDurationMs: summary?.durationMs ?? null,
          },
          "agent run succeeded"
        );
        return validated.data;
      }
      agentLog.warn(
        { attempt, issues: validated.error.issues, rawSnippet: raw.slice(0, 500) },
        "agent output failed schema validation"
      );
      if (attempt >= MAX_AGENT_RETRY_COUNT) {
        throw new AgentValidationError(
          "Agent output failed schema validation",
          JSON.stringify(validated.error.issues)
        );
      }
      await session.prompt(buildSchemaRetryPrompt(JSON.stringify(validated.error.issues), jsonSchemaStr));
      raw = getAssistantText(session.messages as unknown[]);
    }
    throw new AgentValidationError("Agent failed after retry", "No valid output produced");
  } catch (err) {
    const summary = tracer?.summary();
    agentLog.error(
      {
        err,
        durationMs: Date.now() - runStartedAt,
        piTurns: summary?.turnCount ?? null,
        piEvents: summary?.eventCount ?? null,
        piLastText: summary?.lastTextSnippet ?? null,
      },
      "agent run failed"
    );
    throw err;
  } finally {
    try {
      await tracer?.flush();
    } catch (err) {
      agentLog.warn({ err }, "pi trace flush failed");
    }
    tracer?.detach();
    await session.dispose();
  }
}
