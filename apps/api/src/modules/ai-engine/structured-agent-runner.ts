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
import { env } from "../../core/env";
import { logger } from "../../core/logger";
import { piRuntime } from "./pi-runtime";
import { attachPiTracer, type PiTraceEvent } from "./pi-tracer";
import { parseWithSchemaRetry } from "./schema-retry";

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

/**
 * Chỉ run có `tools: "WEB"` được nạp web; mặc định không tool để agent không thể tự bịa nguồn.
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

export interface StructuredAgentRequest<T> {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  /** `WEB` loads pi-web-access only; default `NONE` disables every tool. */
  tools?: "WEB" | "NONE";
  /** Tag for logs and trace events. */
  label?: string;
  /** Receives lifecycle events (turn/message/tool); streaming deltas are only logged. */
  onEvent?: (event: PiTraceEvent) => void;
}

/**
 * Why: backend owns schema enforcement. Pi is an LLM harness only —
 * parse + Zod.validate here, retry with validation errors, then fail with AgentValidationError.
 * Every run is traced into pino (and the optional onEvent callback).
 */
export async function runStructuredAgent<T>(request: StructuredAgentRequest<T>): Promise<T> {
  const { systemPrompt, userPrompt, schema, onEvent } = request;
  const label = request.label ?? "agent";
  await piRuntime.ensureInit();
  if (!piRuntime.modelRuntime || !piRuntime.model || !piRuntime.isReady) {
    throw new Error("Pi model runtime is not ready");
  }
  const agentLog = logger.child({ scope: "agent", label, model: piRuntime.model.id });
  const liveModel = piRuntime.modelRuntime.getModel(env.PI_PROVIDER, piRuntime.model.id);
  if (!liveModel) throw new Error(`Model ${piRuntime.model.id} is no longer available`);

  // Minimal resource surface: no skills, no extensions, no context files.
  const settingsManager = SettingsManager.inMemory();
  settingsManager.setDefaultThinkingLevel(env.PI_THINKING_LEVEL);

  const jsonSchema = zodToJsonSchema(schema, { target: "openAi" });
  delete (jsonSchema as Record<string, unknown>)["$schema"];
  const jsonSchemaStr = JSON.stringify(jsonSchema, null, 2);

  const fullSystemPrompt = `${systemPrompt}\n\n<response_format>\nYou MUST respond with valid JSON matching the schema below. Do not include any markdown fences or conversational text outside the JSON.\n<schema>\n${jsonSchemaStr}\n</schema>\n</response_format>`;

  const useWebTools = request.tools === "WEB";

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

  // Subscribe BEFORE the first prompt so no turn/message/tool event is missed; detach in finally.
  const tracer = attachPiTracer(session.subscribe.bind(session), { label, attempt: 0 }, onEvent);
  const runStartedAt = Date.now();
  agentLog.info(
    {
      systemPromptLength: fullSystemPrompt.length,
      userPromptLength: userPrompt.length,
      userPromptSnippet: userPrompt.slice(0, 500),
    },
    "agent run started"
  );

  const promptAndRead = async (prompt: string) => {
    await session.prompt(prompt);
    return getAssistantText(session.messages as unknown[]);
  };

  try {
    const result = await parseWithSchemaRetry(await promptAndRead(userPrompt), schema, jsonSchemaStr, {
      reprompt: promptAndRead,
      onInvalid: (info) => agentLog.warn(info, "agent output invalid"),
    });
    const summary = tracer.summary();
    agentLog.info(
      {
        attempt: result.attempt,
        durationMs: Date.now() - runStartedAt,
        outputSnippet: result.raw.slice(0, 500),
        piTurns: summary.turnCount,
        piEvents: summary.eventCount,
        piTokenApprox: summary.tokenApprox,
        piDurationMs: summary.durationMs,
      },
      "agent run succeeded"
    );
    return result.data;
  } catch (err) {
    const summary = tracer.summary();
    agentLog.error(
      {
        err,
        durationMs: Date.now() - runStartedAt,
        piTurns: summary.turnCount,
        piEvents: summary.eventCount,
        piLastText: summary.lastTextSnippet,
      },
      "agent run failed"
    );
    throw err;
  } finally {
    tracer.detach();
    await session.dispose();
  }
}
