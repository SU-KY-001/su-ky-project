import type { AgentSessionEvent, ToolDefinition } from "@earendil-works/pi-coding-agent";
import { readField } from "./provider-failure";

/** Raw tool result as delivered to `onToolResult`: before redaction; the caller must never log `text`. */
export interface ToolResultEvent {
  toolName: string;
  toolCallId: string;
  args: unknown;
  text: string;
  isError: boolean;
}

/** Names of the pi-web-access tools a `tools: "WEB"` run may call (hard allowlist on the registry). */
export const WEB_TOOL_NAMES = ["web_search", "fetch_content", "get_search_content", "source_check"];

/** Allowlist for one session: custom tools and the web tools are a union; no tools at all is the default. */
export function selectSessionTools(customTools: ToolDefinition[] | undefined, useWebTools: boolean): string[] {
  return [...new Set([...(customTools ?? []).map((tool) => tool.name), ...(useWebTools ? WEB_TOOL_NAMES : [])])];
}

function resultText(result: unknown): string {
  const content = readField(result, "content");
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => (readField(block, "type") === "text" && typeof readField(block, "text") === "string" ? (readField(block, "text") as string) : ""))
    .join("\n");
}

/**
 * Session listener that pairs `tool_execution_start` (has args) with `tool_execution_end` (has result)
 * and forwards one ToolResultEvent per call. A throwing callback is reported, never allowed to break the run.
 */
export function createToolResultListener(
  onToolResult: (event: ToolResultEvent) => void,
  onCallbackError: (err: unknown) => void
): (event: AgentSessionEvent) => void {
  const argsByCall = new Map<string, unknown>();
  return (event) => {
    if (event.type === "tool_execution_start") {
      argsByCall.set(event.toolCallId, event.args);
      return;
    }
    if (event.type !== "tool_execution_end") return;
    const args = argsByCall.get(event.toolCallId);
    argsByCall.delete(event.toolCallId);
    try {
      onToolResult({
        toolName: event.toolName,
        toolCallId: event.toolCallId,
        args,
        text: resultText(event.result),
        isError: event.isError,
      });
    } catch (err) {
      onCallbackError(err);
    }
  };
}
