import { AgentAbortedError, AgentTimeoutError } from "./errors";

export interface RunGuard {
  /** Fires on caller abort or deadline; wire it to `session.abort()`. */
  signal: AbortSignal;
  /** Rejects with AgentAbortedError / AgentTimeoutError. Race it against work that may never settle (hung tool, endless tool loop). */
  expired: Promise<never>;
  dispose: () => void;
}

/**
 * Why: Pi's provider timeout bounds one request, not a run of many tool turns. This bounds the whole run
 * and composes the caller's signal, so a stuck tool cannot hold a worker slot forever.
 */
export function createRunGuard(callerSignal: AbortSignal | undefined, timeoutMs: number): RunGuard {
  const controller = new AbortController();
  let fail!: (error: Error) => void;
  const expired = new Promise<never>((_, reject) => {
    fail = reject;
  });
  expired.catch(() => undefined); // Never an unhandled rejection when the run finishes first.

  const trigger = (error: Error) => {
    if (controller.signal.aborted) return;
    controller.abort();
    fail(error);
  };
  const timer = setTimeout(() => trigger(new AgentTimeoutError(timeoutMs)), timeoutMs);
  const onCallerAbort = () => trigger(new AgentAbortedError());
  if (callerSignal?.aborted) onCallerAbort();
  else callerSignal?.addEventListener("abort", onCallerAbort, { once: true });

  return {
    signal: controller.signal,
    expired,
    dispose: () => {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", onCallerAbort);
    },
  };
}
