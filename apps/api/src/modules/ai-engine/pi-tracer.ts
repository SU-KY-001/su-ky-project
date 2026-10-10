import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { logger } from "../../core/logger";

const MAX_TEXT_SNIPPET_LENGTH = 500;

function truncate(text: string, maxLength: number = MAX_TEXT_SNIPPET_LENGTH): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…(+${text.length - maxLength} chars)`;
}

function readContentField(message: unknown): unknown {
  if (!message || typeof message !== "object") return undefined;
  if (!("content" in message)) return undefined;
  return message.content;
}

function readTextField(block: unknown): string {
  if (!block || typeof block !== "object") return "";
  if (!("type" in block) || !("text" in block)) return "";
  if (block.type !== "text" || typeof block.text !== "string") return "";
  return block.text;
}

function extractAssistantText(message: unknown): string {
  const content = readContentField(message);
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map(readTextField).filter(Boolean).join("");
}

/**
 * Why: Pi sessions are fire-and-forget LLM calls: no visibility into turns, streaming
 * tokens, tool calls or latency. The tracer mirrors session events into pino and
 * forwards lifecycle events to an optional caller callback. It never persists anything.
 */
export interface PiTraceContext {
  label: string;
  attempt: number;
}

export interface PiTraceEvent {
  type: string;
  message: string;
  metadata: Record<string, unknown>;
}

export interface PiTraceSummary {
  turnCount: number;
  tokenApprox: number;
  eventCount: number;
  durationMs: number;
  lastTextSnippet: string;
}

export function summarizeEvent(
  event: AgentSessionEvent
): { type: string; message: string; metadata: Record<string, unknown> } | null {
  switch (event.type) {
    case "turn_start":
      return {
        type: "turn.started",
        message: "turn started",
        metadata: {},
      };
    case "turn_end":
      return {
        type: "turn.ended",
        message: "turn ended",
        metadata: {},
      };
    case "message_start": {
      const role = "role" in event.message ? String(event.message.role ?? "unknown") : "unknown";
      return {
        type: "message.started",
        message: `message started (${role})`,
        metadata: { role },
      };
    }
    case "message_update": {
      const text = extractAssistantText(event.message);
      const delta =
        event.assistantMessageEvent.type === "text_delta"
          ? event.assistantMessageEvent.delta
          : event.assistantMessageEvent.type === "thinking_delta"
            ? event.assistantMessageEvent.delta
            : "";
      return {
        type: "message.streaming",
        message: truncate(delta || text || "(streaming)"),
        metadata: {
          streamEvent: event.assistantMessageEvent.type,
          snippet: truncate(text),
        },
      };
    }
    case "message_end": {
      const text = extractAssistantText(event.message);
      const role = "role" in event.message ? String(event.message.role ?? "unknown") : "unknown";
      return {
        type: "message.ended",
        message: truncate(text || `message ended (${role})`),
        metadata: {
          role,
          length: text.length,
        },
      };
    }
    case "tool_execution_start":
      return {
        type: "tool.started",
        message: `tool ${event.toolName} started`,
        metadata: { toolCallId: event.toolCallId, toolName: event.toolName },
      };
    case "tool_execution_update":
      return {
        type: "tool.streaming",
        message: `tool ${event.toolName} streaming`,
        metadata: { toolCallId: event.toolCallId, toolName: event.toolName },
      };
    case "tool_execution_end":
      return {
        type: "tool.ended",
        message: `tool ${event.toolName} ${event.isError ? "failed" : "completed"}`,
        metadata: {
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          isError: event.isError,
        },
      };
    default:
      return null;
  }
}

export function attachPiTracer(
  subscribe: (listener: (event: AgentSessionEvent) => void) => () => void,
  ctx: PiTraceContext,
  onEvent?: (event: PiTraceEvent) => void
): { summary: () => PiTraceSummary; detach: () => void } {
  const base = logger.child({ scope: "pi", label: ctx.label, attempt: ctx.attempt });
  const startedAt = Date.now();
  let turnCount = 0;
  let tokenApprox = 0;
  let eventCount = 0;
  let lastTextSnippet = "";

  const detach = subscribe((event) => {
    eventCount += 1;
    const summary = summarizeEvent(event);

    if (event.type === "turn_start") turnCount += 1;
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      tokenApprox += Math.max(1, Math.ceil(event.assistantMessageEvent.delta.length / 4));
      lastTextSnippet = truncate(extractAssistantText(event.message));
    }
    if (event.type === "message_end") {
      lastTextSnippet = truncate(extractAssistantText(event.message));
    }

    if (!summary) {
      base.debug({ piEvent: event.type }, `[${ctx.label}] unmirrored pi event`);
      return;
    }
    base.info({ piEvent: event.type, ...summary.metadata }, `[${ctx.label}] ${summary.message}`);
    // Streaming deltas fire dozens of times per run: logged above, not forwarded.
    if (summary.type === "message.streaming" || !onEvent) return;
    try {
      onEvent(summary);
    } catch (err) {
      base.warn({ err }, "pi trace onEvent callback failed");
    }
  });

  return {
    detach,
    summary: () => ({
      turnCount,
      tokenApprox,
      eventCount,
      durationMs: Date.now() - startedAt,
      lastTextSnippet,
    }),
  };
}
