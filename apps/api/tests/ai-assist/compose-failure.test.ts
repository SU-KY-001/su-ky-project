import { describe, expect, it } from "bun:test";
import { mapComposeFailure } from "../../src/modules/ai-assist/compose/application/compose-failure";
import { AgentAbortedError, AiUnavailableError } from "../../src/modules/ai-engine";

const idle = new AbortController().signal;

describe("mapComposeFailure", () => {
  it("turns a runtime that vanished mid-run into 503 AI_UNAVAILABLE, not a 500", () => {
    expect(mapComposeFailure(new AiUnavailableError(), idle, idle).error).toMatchObject({ status: 503, code: "AI_UNAVAILABLE" });
  });

  it("reports a caller abort as 400 REQUEST_ABORTED", () => {
    expect(mapComposeFailure(new AgentAbortedError(), idle, idle).error).toMatchObject({ status: 400, code: "REQUEST_ABORTED" });
  });
});
