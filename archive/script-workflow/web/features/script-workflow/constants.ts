/** Merge bursts of SSE events into one refetch. */
export const EVENT_COALESCE_MS = 500;
/** Consecutive SSE errors before the UI falls back to polling. */
export const MAX_SSE_RETRIES = 3;
/** Polling period used while realtime is degraded. */
export const POLL_INTERVAL_MS = 3000;
export const LIST_PAGE_LIMIT = 20;
export const EVENTS_LIMIT = 100;
/** A running step with no event for this long gets a "taking longer than usual" hint. */
export const SLOW_STEP_WARNING_MS = 5 * 60 * 1000;
/** How long the "copied" confirmation stays visible. */
export const COPIED_LABEL_MS = 2000;

export const NEW_WORKFLOW_PATH = "/moderator/script-workflows/new";
export function workflowDetailPath(id: number): string {
  return `/moderator/script-workflows/${id}`;
}
export function workflowPublicationPath(id: number): string {
  return `/moderator/script-workflows/${id}/publication`;
}
