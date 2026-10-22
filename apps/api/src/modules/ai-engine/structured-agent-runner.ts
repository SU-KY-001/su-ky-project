import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  DefaultResourceLoader,
  SessionManager,
  SettingsManager,
  createAgentSession,
  type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../core/env";
import { logger } from "../../core/logger";
import { AgentAbortedError } from "./errors";
import { piRuntime } from "./pi-runtime";
import { attachPiTracer, type PiTraceEvent } from "./pi-tracer";
import { classifyProviderFailure, readField, sumUsage, type AgentUsage } from "./provider-failure";
import { createRunGuard } from "./run-guard";
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
  const text = readField(block, "text");
  return typeof text === "string" ? text : "";
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(readTextOfBlock).join("\n");
  }
  return "";
}

function readRoleOf(message: unknown): string | undefined {
  const role = readField(message, "role");
  return typeof role === "string" ? role : undefined;
}

function readContentOf(message: unknown): string | AgentTextBlock[] | undefined {
  const content = readField(message, "content");
  return typeof content === "string" || Array.isArray(content) ? content : undefined;
}

function getAssistantText(messages: unknown[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (readRoleOf(m) === "assistant") return extractText(readContentOf(m));
  }
  return "";
}

/** Stop state of the last assistant message: `error`/`length` mean the provider failed, not the model's content. */
function getLastStop(messages: unknown[]): { stopReason?: string; errorMessage?: string } {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (readRoleOf(m) !== "assistant") continue;
    const stopReason = readField(m, "stopReason");
    const errorMessage = readField(m, "errorMessage");
    return {
      stopReason: typeof stopReason === "string" ? stopReason : undefined,
      errorMessage: typeof errorMessage === "string" ? errorMessage : undefined,
    };
  }
  return {};
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

type ThinkingLevel = typeof env.PI_THINKING_LEVEL;

export interface StructuredAgentRequest<T> {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  /** `WEB` loads pi-web-access only; default `NONE` disables every tool. */
  tools?: "WEB" | "NONE";
  /** Backend-owned, read-only tools for this run only; their names become the allowlist. */
  customTools?: ToolDefinition[];
  /** Tag for logs and trace events. */
  label?: string;
  /** Receives lifecycle events (turn/message/tool); streaming deltas are only logged. */
  onEvent?: (event: PiTraceEvent) => void;
  /** Aborts the run and the underlying Pi session; the call rejects with AgentAbortedError. A deadline (PI_RUN_TIMEOUT_MS) rejects with AgentTimeoutError. */
  signal?: AbortSignal;
  /** Overrides env PI_THINKING_LEVEL for this run only. */
  thinking?: ThinkingLevel;
  /** Default true: logs never contain prompt, source or output text (lengths, labels, tokens only). */
  redactContent?: boolean;
}

export interface AgentRunResult<T> {
  data: T;
  usage: AgentUsage;
  model: string;
  durationMs: number;
  /** Prompts needed for valid output: 1 = first reply valid, 2 = one schema correction. */
  attempts: number;
}

/**
 * Why: backend owns schema enforcement. Pi is an LLM harness only —
 * parse + Zod.validate here, retry with validation errors, then fail with AgentValidationError.
 * Provider failures surface as AgentProviderError, caller aborts as AgentAbortedError.
 * Every run is traced into pino (and the optional onEvent callback).
 */
export async function runStructuredAgent<T>(request: StructuredAgentRequest<T>): Promise<AgentRunResult<T>> {
  const { systemPrompt, userPrompt, schema, onEvent, signal } = request;
  const label = request.label ?? "agent";
  const redactContent = request.redactContent ?? true;
  if (signal?.aborted) throw new AgentAbortedError();
  await piRuntime.ensureInit();
  if (!piRuntime.modelRuntime || !piRuntime.model || !piRuntime.isReady) {
    throw new Error("Pi model runtime is not ready");
  }
  const modelId = piRuntime.model.id;
  const agentLog = logger.child({ scope: "agent", label, model: modelId });
  const liveModel = piRuntime.modelRuntime.getModel(env.PI_PROVIDER, modelId);
  if (!liveModel) throw new Error(`Model ${modelId} is no longer available`);

  const thinkingLevel = request.thinking ?? env.PI_THINKING_LEVEL;
  // Pi's own retry is the only retry layer; provider.maxRetries 0 stops the SDK stacking a second one.
  // Pi itself does not retry quota/billing text or errors that match no transient pattern.
  const settingsManager = SettingsManager.inMemory({
    retry: {
      enabled: env.PI_RETRY_MAX > 0,
      maxRetries: env.PI_RETRY_MAX,
      baseDelayMs: env.PI_RETRY_BASE_DELAY_MS,
      provider: { timeoutMs: env.PI_PROVIDER_TIMEOUT_MS, maxRetries: 0 },
    },
  });
  settingsManager.setDefaultThinkingLevel(thinkingLevel);

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
    thinkingLevel,
  };
  if (request.customTools?.length) {
    sessionOptions.tools = request.customTools.map((tool) => tool.name);
    sessionOptions.customTools = request.customTools;
  } else if (useWebTools) {
    // Allowlist là bộ lọc cứng trên registry: mọi tool khác bị loại bỏ.
    sessionOptions.tools = [...WEB_TOOL_NAMES];
  } else {
    sessionOptions.tools = [];
    sessionOptions.noTools = "all";
  }

  const { session } = await createAgentSession(sessionOptions);
  const guard = createRunGuard(signal, env.PI_RUN_TIMEOUT_MS);
  const onAbort = () => {
    session.abort().catch((err: unknown) => agentLog.warn({ err }, "session abort failed"));
  };
  guard.signal.addEventListener("abort", onAbort, { once: true });

  // Subscribe BEFORE the first prompt so no turn/message/tool event is missed; detach in finally.
  const tracer = attachPiTracer(session.subscribe.bind(session), { label, attempt: 0, redactContent }, onEvent);
  const runStartedAt = Date.now();
  agentLog.info(
    {
      systemPromptLength: fullSystemPrompt.length,
      userPromptLength: userPrompt.length,
      ...(redactContent ? {} : { userPromptSnippet: userPrompt.slice(0, 500) }),
    },
    "agent run started"
  );

  const promptAndRead = async (prompt: string) => {
    if (guard.signal.aborted) throw new AgentAbortedError();
    // Race: a hung tool or endless tool loop must not keep this call (and its worker slot) alive.
    await Promise.race([session.prompt(prompt), guard.expired]);
    const messages = session.messages as unknown[];
    const { stopReason, errorMessage } = getLastStop(messages);
    if (stopReason === "aborted") throw new AgentAbortedError();
    // Without this a provider 403/429 reads as empty text and is reported as "invalid JSON".
    if (stopReason === "error" || stopReason === "length") throw classifyProviderFailure(stopReason, errorMessage);
    return getAssistantText(messages);
  };

  try {
    const result = await parseWithSchemaRetry(await promptAndRead(userPrompt), schema, jsonSchemaStr, {
      reprompt: promptAndRead,
      onInvalid: (info) =>
        agentLog.warn(redactContent ? { attempt: info.attempt, issues: info.issues } : info, "agent output invalid"),
    });
    const summary = tracer.summary();
    const usage = sumUsage(session.messages);
    const durationMs = Date.now() - runStartedAt;
    agentLog.info(
      {
        attempt: result.attempt,
        durationMs,
        outputLength: result.raw.length,
        ...(redactContent ? {} : { outputSnippet: result.raw.slice(0, 500) }),
        usage,
        piTurns: summary.turnCount,
        piEvents: summary.eventCount,
        piTokenApprox: summary.tokenApprox,
        piDurationMs: summary.durationMs,
      },
      "agent run succeeded"
    );
    return { data: result.data, usage, model: modelId, durationMs, attempts: result.attempt + 1 };
  } catch (err) {
    const summary = tracer.summary();
    agentLog.error(
      {
        err,
        durationMs: Date.now() - runStartedAt,
        piTurns: summary.turnCount,
        piEvents: summary.eventCount,
        ...(redactContent ? {} : { piLastText: summary.lastTextSnippet }),
      },
      "agent run failed"
    );
    throw err;
  } finally {
    guard.signal.removeEventListener("abort", onAbort);
    guard.dispose();
    tracer.detach();
    await session.dispose();
  }
}
