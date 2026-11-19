// Smoke test for the Pi provider. Run from apps/api:  bun --env-file=../../.env scripts/pi-hello.ts [prompt]
import { z } from "zod";
import { env } from "../src/core/env";
import { runStructuredAgent } from "../src/modules/ai-engine/structured-agent-runner";

const prompt = process.argv[2] ?? "hello";

const result = await runStructuredAgent({
  label: "pi-hello",
  systemPrompt: "You are a connectivity check. Reply briefly to the user.",
  userPrompt: prompt,
  schema: z.object({ reply: z.string() }),
});

console.log({ provider: env.PI_PROVIDER, model: result.model, durationMs: result.durationMs, usage: result.usage });
console.log(result.data.reply);
