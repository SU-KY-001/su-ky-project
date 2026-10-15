import { describe, expect, it, mock } from "bun:test";
import { CloudinaryGateway } from "../src/modules/media/infrastructure/cloudinary.gateway";

mock.module("../src/core/env", () => ({
  env: { CLOUDINARY_CLOUD_NAME: "test-cloud", CLOUDINARY_API_KEY: "test-key", CLOUDINARY_API_SECRET: "test-secret", CLOUDINARY_TIMEOUT_MS: 1000 },
}));

const seen: Record<string, unknown>[] = [];
let response: Record<string, unknown> = { version: 1791632728, format: "mp3", bytes: 48944, duration: 3.030204 };
mock.module("cloudinary", () => ({
  v2: {
    config: () => {},
    api: {
      resource: async (_id: string, opts: Record<string, unknown>) => {
        seen.push(opts);
        return response;
      },
    },
    uploader: { destroy: async () => ({ result: "ok" }) },
    utils: { api_sign_request: () => "sig" },
    url: () => "https://example.invalid/x.mp3",
  },
}));

describe("CloudinaryGateway.fetchResource", () => {
  it("requests media_metadata so audio duration is returned and maps it to durationMs", async () => {
    const gateway = new CloudinaryGateway();
    const resource = await gateway.fetchResource("su-ky/audio/test-id", "AUDIO");
    expect(seen[0]?.media_metadata).toBe(true);
    expect(resource?.durationMs).toBe(3030);
  });

  it("maps image width/height and leaves them null when Cloudinary omits them", async () => {
    const gateway = new CloudinaryGateway();
    response = { version: 1, format: "jpg", bytes: 1000, width: 600, height: 900 };
    expect(await gateway.fetchResource("su-ky/image/a", "IMAGE")).toMatchObject({ widthPx: 600, heightPx: 900 });
    response = { version: 1, format: "jpg", bytes: 1000 };
    expect(await gateway.fetchResource("su-ky/image/b", "IMAGE")).toMatchObject({ widthPx: null, heightPx: null });
  });
});
