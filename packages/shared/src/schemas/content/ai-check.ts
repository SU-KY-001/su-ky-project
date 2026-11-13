import { z } from "zod";

export const AI_CHECK_MAX_BLOCKS = 200;
export const AI_CHECK_MAX_NOTE_CHARS = 1000;
export const AI_CHECK_MAX_EVIDENCE = 3;

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const HASH_RADIX = 36;

/** NFC → gộp khoảng trắng → trim → FNV-1a 32-bit → base36. Web và api phải cùng kết quả. */
export function hashBlockText(text: string): string {
  const normalized = text.normalize("NFC").replace(/\s+/g, " ").trim();
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < normalized.length; i++) {
    hash = Math.imul(hash ^ normalized.charCodeAt(i), FNV_PRIME) >>> 0;
  }
  return hash.toString(HASH_RADIX);
}

const uuid = z.string().uuid();
const timestamp = z.coerce.date();
const BlockRefSchema = z.string().regex(/^b\d+$/);

export const AiCheckBlockSchema = z.object({
  ref: BlockRefSchema,
  text: z.string(),
  hash: z.string().min(1),
  prev: z.string(),
  dup: z.number().int().min(1),
});

export const CreateAiCheckSchema = z
  .object({
    kind: z.literal("SCRIPT_REVIEW"),
    scope: z.enum(["ALL", "SELECTION"]),
    blocks: z.array(AiCheckBlockSchema).min(1).max(AI_CHECK_MAX_BLOCKS),
    note: z.string().max(AI_CHECK_MAX_NOTE_CHARS).optional(),
  })
  .refine((v) => new Set(v.blocks.map((b) => b.ref)).size === v.blocks.length, {
    message: "ref không được trùng",
    path: ["blocks"],
  });
export type CreateAiCheckInput = z.infer<typeof CreateAiCheckSchema>;

export const AiCheckStatusSchema = z.enum(["RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]);
export const AiIssueKindSchema = z.enum(["FACT_DOUBT", "READABILITY"]);
export const AiIssueSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const AiItemStatusSchema = z.enum(["OPEN", "REVIEWED"]);
export const AiItemBasisSchema = z.enum(["CONTRADICTED", "NOT_FOUND"]);

export const AiEvidenceSchema = z.object({
  sourceId: z.string(),
  page: z.number().int().nullable(),
  quote: z.string(),
});

export const AiCheckProgressSchema = z.object({
  processedBlocks: z.number().int(),
  totalBlocks: z.number().int(),
  failedBlocks: z.number().int(),
});

export const AiCheckSchema = AiCheckProgressSchema.extend({
  id: uuid,
  episodeId: uuid,
  kind: z.literal("SCRIPT_REVIEW"),
  status: AiCheckStatusSchema,
  toolCalls: z.number().int(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  errorCode: z.string().nullable(),
  itemCounts: z.object({ open: z.number().int(), reviewed: z.number().int() }),
  startedAt: timestamp,
  finishedAt: timestamp.nullable(),
});
export type AiCheck = z.infer<typeof AiCheckSchema>;

export const AiCheckItemSchema = z.object({
  id: uuid,
  checkId: uuid,
  seq: z.number().int(),
  blockRef: z.string(),
  blockHash: z.string(),
  blockPrevHash: z.string(),
  blockDup: z.number().int(),
  kind: AiIssueKindSchema,
  severity: AiIssueSeveritySchema,
  basis: AiItemBasisSchema,
  evidence: z.array(AiEvidenceSchema).max(AI_CHECK_MAX_EVIDENCE),
  message: z.string(),
  suggestion: z.string().nullable(),
  status: AiItemStatusSchema,
  appliedAt: timestamp.nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type AiCheckItem = z.infer<typeof AiCheckItemSchema>;

export const PatchAiCheckItemSchema = z
  .object({ status: z.literal("REVIEWED"), applied: z.literal(true) })
  .partial()
  .refine((v) => v.status !== undefined || v.applied !== undefined, {
    message: "Cần ít nhất một trường",
  });
export type PatchAiCheckItemInput = z.infer<typeof PatchAiCheckItemSchema>;

export const AiCheckEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("progress"), data: AiCheckProgressSchema }),
  z.object({ type: z.literal("item"), data: AiCheckItemSchema }),
  z.object({ type: z.literal("done"), data: AiCheckSchema }),
  z.object({ type: z.literal("failed"), data: AiCheckSchema }),
]);
export type AiCheckEvent = z.infer<typeof AiCheckEventSchema>;
