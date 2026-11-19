import { z } from "zod";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/apiError";
import { newIdempotencyKey } from "@/lib/idempotency";
const ticketSchema = z.object({
  assetId: z.string().uuid(),
  upload: z.object({
    url: z.string().url(),
    fields: z.record(z.string(), z.string()),
  }),
});
const verifiedSchema = z.object({
  assetId: z.string().uuid(),
  status: z.literal("READY"),
});
export async function uploadCatalogMedia(
  file: File,
  kind: "DOCUMENT" | "AUDIO" | "IMAGE" = "DOCUMENT",
  signal?: AbortSignal,
) {
  const ticketResponse = await client.api.studio["media-assets"].$post(
    {
      json: {
        kind,
        fileName: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
      },
    },
    { headers: { "Idempotency-Key": newIdempotencyKey() }, init: { signal } },
  );
  if (!ticketResponse.ok) throw await ApiError.fromResponse(ticketResponse);
  const ticket = ticketSchema.parse(await ticketResponse.json());
  const body = new FormData();
  for (const [key, value] of Object.entries(ticket.upload.fields))
    body.set(key, value);
  body.set("file", file);
  const uploaded = await fetch(ticket.upload.url, { method: "POST", body, signal });
  if (!uploaded.ok)
    throw new Error(
      kind === "IMAGE" ? "Kho lưu trữ chưa nhận được ảnh. Kiểm tra kết nối và thử tải lại." : "Không tải được tài liệu lên kho lưu trữ. Vui lòng thử lại.",
    );
  const result = z
    .object({ public_id: z.string() })
    .parse(await uploaded.json());
  const verified = await client.api.studio["media-assets"][":id"].verify.$post({
    param: { id: ticket.assetId },
    json: { publicId: result.public_id },
  }, { init: { signal } });
  if (!verified.ok) throw await ApiError.fromResponse(verified);
  return verifiedSchema.parse(await verified.json()).assetId;
}
