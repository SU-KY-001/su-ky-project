import { getSystemConfig } from "../../core/config/system-config";
import { AiDisabledError, AiUnavailableError } from "./errors";
import { piRuntime } from "./pi-runtime";

/**
 * Why: AI features must fail fast with a clear 503 instead of starting a run that can never work.
 * `isReady` (model + credential for the configured provider) is the right test, not a specific API key.
 */
export async function assertAiReady(): Promise<void> {
  if (!(await getSystemConfig("ai_assist.enabled"))) throw new AiDisabledError();
  await piRuntime.ensureInit();
  if (!piRuntime.isReady) throw new AiUnavailableError();
}
