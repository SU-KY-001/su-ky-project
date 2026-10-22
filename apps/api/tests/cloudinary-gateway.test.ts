import { describe, expect, it, mock } from "bun:test";
import { CloudinaryGateway } from "../src/modules/media/infrastructure/cloudinary.gateway";
import type { MediaAsset } from "../src/modules/media/domain/media.entity";

mock.module("../src/core/env", () => ({
  env: {
    CLOUDINARY_CLOUD_NAME: "test-cloud",
    CLOUDINARY_API_KEY: "test-key",
    CLOUDINARY_API_SECRET: "test-secret",
    CLOUDINARY_TIMEOUT_MS: 1000,
    CLOUDINARY_DOCUMENT_DELIVERY_TTL_SECONDS: 3600,
  },
}));

const seen: Record<string, unknown>[] = [];
const downloadRequests: Array<{ publicId: string; format: string; options: Record<string, unknown> }> = [];
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
    utils: {
      api_sign_request: () => "sig",
      private_download_url: (
        publicId: string,
        format: string,
        options: Record<string, unknown>,
      ) => {
        downloadRequests.push({ publicId, format, options });
        return "https://download.invalid/source.pdf";
      },
    },
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
  it("creates a time-limited private download URL for PDF sources", () => {
    const gateway = new CloudinaryGateway();
    const asset = {
      id: "asset",
      kind: "DOCUMENT",
      publicId: "su-ky/document/asset.pdf",
      status: "READY",
      version: 1n,
      format: "pdf",
      sizeBytes: 1n,
      durationMs: null,
      widthPx: null,
      heightPx: null,
      uploadedById: "user",
      createdAt: new Date(),
      verifiedAt: new Date(),
      detachedAt: null,
      deletedAt: null,
    } satisfies MediaAsset;
    expect(gateway.deliveryUrl(asset)).toBe("https://download.invalid/source.pdf");
    expect(downloadRequests[0]?.publicId).toBe(asset.publicId);
    expect(downloadRequests[0]?.format).toBe("pdf");
    expect(downloadRequests[0]?.options).toMatchObject({ resource_type: "raw", type: "upload" });
    expect(downloadRequests[0]?.options.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
