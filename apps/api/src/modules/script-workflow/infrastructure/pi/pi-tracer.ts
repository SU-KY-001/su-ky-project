import { z } from "zod";
import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { logger } from "../../../../core/logger";
import type { ScriptWorkflowRepository } from "../../domain/script-workflow.repository";

export type LogWorkflowEvent = ScriptWorkflowRepository["logEvent"];

const MAX_TEXT_SNIPPET_LENGTH = 500;
const MAX_METADATA_BYTES = 4000;

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
 * Why: Pi sessions are fire-and-forget LLM calls today — no visibility into
 * turns, streaming tokens, tool calls, retries, or latency. This tracer
 * subscribes to AgentSession events, mirrors them into pino (per workflow/step
 * child logger) and persists a compact row per event into workflow_events so the
 * run can be replayed from the DB after the fact.
 */
export interface PiTraceContext {
  workflowRunId: number;
  stepType: string;
  attempt: number;
}

export interface PiTraceSummary {
  turnCount: number;
  tokenApprox: number;
  eventCount: number;
  durationMs: number;
  lastTextSnippet: string;
}

export function summarizeEventForDb(
  event: AgentSessionEvent
): { type: string; message: string; metadataJson: Record<string, unknown> } | null {
  switch (event.type) {
    case "turn_start":
      return {
        type: "turn.started",
        message: "turn started",
        metadataJson: {},
      };
    case "turn_end":
      return {
        type: "turn.ended",
        message: "turn ended",
        metadataJson: {},
      };
    case "message_start": {
      const role = "role" in event.message ? String(event.message.role ?? "unknown") : "unknown";
      return {
        type: "message.started",
        message: `message started (${role})`,
        metadataJson: { role },
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
        metadataJson: {
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
        metadataJson: {
          role,
          length: text.length,
        },
      };
    }
    case "tool_execution_start":
      return {
        type: "tool.started",
        message: `tool ${event.toolName} started`,
        metadataJson: { toolCallId: event.toolCallId, toolName: event.toolName },
      };
    case "tool_execution_update":
      return {
        type: "tool.streaming",
        message: `tool ${event.toolName} streaming`,
        metadataJson: { toolCallId: event.toolCallId, toolName: event.toolName },
      };
    case "tool_execution_end":
      return {
        type: "tool.ended",
        message: `tool ${event.toolName} ${event.isError ? "failed" : "completed"}`,
        metadataJson: {
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          isError: event.isError,
        },
      };
    default:
      return null;
  }
}

function sizeOf(value: unknown): number {
  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return 0;
  }
}

// Why: message.streaming fires per text_delta (dozens per run). Pino keeps
// everything; the DB keeps only lifecycle rows so workflow_events stays readable.
const DB_PERSISTED_TYPES: Record<string, true> = {
  "turn.started": true,
  "turn.ended": true,
  "message.started": true,
  "message.ended": true,
  "tool.started": true,
  "tool.streaming": true,
  "tool.ended": true,
};

export function attachPiTracer(
  subscribe: (listener: (event: AgentSessionEvent) => void) => () => void,
  ctx: PiTraceContext,
  logEvent: LogWorkflowEvent
): { summary: () => PiTraceSummary; detach: () => void; flush: () => Promise<void> } {
  const base = logger.child({
    scope: "pi",
    workflowRunId: ctx.workflowRunId,
    step: ctx.stepType,
    attempt: ctx.attempt,
  });
  const startedAt = Date.now();
  let turnCount = 0;
  let tokenApprox = 0;
  let eventCount = 0;
  let lastTextSnippet = "";
  // Fire-and-forget DB mirror: never block or break the agent run.
  let persistChain: Promise<void> = Promise.resolve();

  const detach = subscribe((event) => {
    eventCount += 1;
    const summary = summarizeEventForDb(event);

    if (event.type === "turn_start") turnCount += 1;
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      tokenApprox += Math.max(1, Math.ceil(event.assistantMessageEvent.delta.length / 4));
      lastTextSnippet = truncate(extractAssistantText(event.message));
    }
    if (event.type === "message_end") {
      lastTextSnippet = truncate(extractAssistantText(event.message));
    }

    if (summary) {
      base.info(
        { piEvent: event.type, ...summary.metadataJson },
        `[${ctx.stepType}] ${summary.message}`
      );
      if (!DB_PERSISTED_TYPES[summary.type]) return;
      // Compact + bounded: lifecycle rows carry snippets only, never full dumps.
      const metadataJson: Record<string, unknown> = {
        stepType: ctx.stepType,
        attempt: ctx.attempt,
        ...summary.metadataJson,
      };
      const bounded =
        sizeOf(metadataJson) > MAX_METADATA_BYTES
          ? {
              stepType: ctx.stepType,
              attempt: ctx.attempt,
              snippet: truncate(JSON.stringify(metadataJson).slice(0, MAX_METADATA_BYTES)),
            }
          : metadataJson;
      persistChain = persistChain
        .then(() =>
          logEvent({
            workflowRunId: ctx.workflowRunId,
            type: `pi.${ctx.stepType.toLowerCase()}.${summary.type}`,
            message: summary.message,
            metadataJson: bounded,
          })
        )
        .catch((err) => base.warn({ err }, "pi trace persist failed"));
    } else {
      base.debug({ piEvent: event.type }, `[${ctx.stepType}] unmirrored pi event`);
    }
  });

  return {
    detach,
    flush: () => persistChain,
    summary: () => ({
      turnCount,
      tokenApprox,
      eventCount,
      durationMs: Date.now() - startedAt,
      lastTextSnippet,
    }),
  };
}

export const PiTraceContextSchema = z.object({
  workflowRunId: z.number().int().positive(),
  stepType: z.string().min(1),
  attempt: z.number().int().nonnegative(),
});

export type PiTraceContextType = z.infer<typeof PiTraceContextSchema>;
