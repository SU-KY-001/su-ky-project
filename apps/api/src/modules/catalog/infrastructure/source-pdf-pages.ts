import { prisma, type Prisma } from "@repo/db";
import { getSystemConfig } from "../../../core/config/system-config";
import { DomainError } from "../../../core/errors/domain-error";
import { env } from "../../../core/env";
import { logger } from "../../../core/logger";
import { CloudinaryGateway } from "../../media/infrastructure/cloudinary.gateway";
import { extractPdfPages } from "./pdf-pages";

const INSERT_BATCH_SIZE = 200;

export async function readSourcePdfPages(assetId?: string | null): Promise<string[] | null> {
  if (!assetId) return null;
  const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: assetId } });
  if (asset.format?.toLowerCase() !== "pdf") return null;
  if (asset.kind !== "DOCUMENT" || asset.status !== "READY") {
    throw new DomainError(422, "MEDIA_INVALID", "Tài liệu PDF chưa sẵn sàng.");
  }
  const started = performance.now();
  const maxBytes = await getSystemConfig("media.document.max_bytes");
  const signal = AbortSignal.timeout(env.SOURCE_PDF_TIMEOUT_MS);
  try {
    const response = await fetch(new CloudinaryGateway().deliveryUrl(asset), { signal });
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new DomainError(503, "MEDIA_PROVIDER_UNAVAILABLE", "Không tải được PDF để tách trang. Vui lòng thử lại.");
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) throw new DomainError(422, "MEDIA_TOO_LARGE", "PDF vượt dung lượng cho phép.");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let pages: string[];
    try {
      pages = await extractPdfPages(bytes);
    } catch (error) {
      logger.warn({ assetId, errorName: error instanceof Error ? error.name : "UnknownError" }, "PDF parser rejected document");
      throw new DomainError(422, "MEDIA_INVALID", "Không đọc được PDF. Kiểm tra file có hỏng hoặc được mã hóa không.");
    }
    if (!pages.length) throw new DomainError(422, "MEDIA_INVALID", "PDF không có trang.");
    logger.info({ assetId, pages: pages.length, bytes: size, durationMs: performance.now() - started }, "Source PDF extracted");
    return pages;
  } catch (error) {
    logger.error({ assetId, durationMs: performance.now() - started, errorName: error instanceof Error ? error.name : "UnknownError" }, "Source PDF extraction failed");
    if (error instanceof DomainError) throw error;
    throw new DomainError(503, "MEDIA_PROVIDER_UNAVAILABLE", "Không tải được PDF để tách trang. Vui lòng thử lại.");
  }
}

export async function insertSourcePages(tx: Prisma.TransactionClient, sourceId: string, version: number, pages: string[]): Promise<void> {
  for (let offset = 0; offset < pages.length; offset += INSERT_BATCH_SIZE) {
    await tx.sourcePage.createMany({ data: pages.slice(offset, offset + INSERT_BATCH_SIZE)
      .map((text, index) => ({ sourceId, version, page: offset + index + 1, text })) });
  }
}
