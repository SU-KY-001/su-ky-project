import { z } from "zod";
import { NarrationTypeSchema } from "./episode";

/** Limits shared by api validators and web forms (spec-prompts-compose.md). */
export const ANGLE_NAME_MAX = 60;
export const ANGLE_DESCRIPTION_MAX = 160;
export const ANGLE_GUIDE_MAX = 500;
export const ANGLE_BUILTIN_PREFIX = "builtin:";

export const OUTLINE_TOPIC_MAX = 500;
export const OUTLINE_MIN_WORDS = 150;
export const OUTLINE_MAX_WORDS = 4500;
export const OUTLINE_MIN_SECTIONS = 3;
export const OUTLINE_MAX_SECTIONS = 12;
export const OUTLINE_TITLE_MAX = 80;
export const OUTLINE_GOAL_MAX = 300;
export const OUTLINE_POINT_MAX = 300;
export const OUTLINE_POINTS_MIN = 2;
export const OUTLINE_POINTS_MAX = 5;
export const OUTLINE_WEIGHT_MIN = 1;
export const OUTLINE_WEIGHT_MAX = 5;

export const TONE_CUSTOM_MAX = 500;
export const DRAFT_PREV_MAX_CHARS = 1500;
export const REWRITE_MAX_BLOCKS = 3;
export const REWRITE_MAX_CHARS = 6000;
export const REWRITE_CONTEXT_MAX_CHARS = 600;
export const REWRITE_INSTRUCTION_MAX = 500;
export const REWRITE_MAX_VARIANTS = 10;
export const REWRITE_DEFAULT_VARIANTS = 3;

const uuid = z.string().uuid();
const timestamp = z.coerce.date();
const BlockRefSchema = z.string().regex(/^b\d+$/);

// ---- Narrative angles -------------------------------------------------------------------------

const angleName = z.string().trim().min(1).max(ANGLE_NAME_MAX);
const angleDescription = z.string().trim().max(ANGLE_DESCRIPTION_MAX);
const angleGuide = z.string().trim().max(ANGLE_GUIDE_MAX);

/** `id` is a uuid for the user's angles and `builtin:<slug>` for the read-only built-ins. */
export const AngleSchema = z.object({
  id: z.string().min(1),
  name: angleName,
  description: angleDescription,
  guide: angleGuide,
  builtin: z.boolean(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
});
export type Angle = z.infer<typeof AngleSchema>;

export const CreateAngleSchema = z.object({ name: angleName, description: angleDescription, guide: angleGuide });
export type CreateAngleInput = z.infer<typeof CreateAngleSchema>;

export const UpdateAngleSchema = CreateAngleSchema.partial().refine((v) => Object.values(v).some((x) => x !== undefined), {
  message: "Cần ít nhất một trường",
});
export type UpdateAngleInput = z.infer<typeof UpdateAngleSchema>;

export const AngleListSchema = z.object({ items: z.array(AngleSchema) });

// ---- Tone / narration -------------------------------------------------------------------------

export const TONE_PRESETS = ["calm", "close", "formal"] as const;
export const TonePresetSchema = z.enum(TONE_PRESETS);

/** Either a server-side preset or the moderator's own free-text description. */
export const ToneSchema = z.union([
  z.object({ preset: TonePresetSchema }).strict(),
  z.object({ custom: z.string().trim().min(1).max(TONE_CUSTOM_MAX) }).strict(),
]);
export type ToneInput = z.infer<typeof ToneSchema>;

/** Narration type as sent by compose requests (same enum as episode narrations). */
export const ComposeNarrationSchema = NarrationTypeSchema;

const narrationFields = {
  narration: ComposeNarrationSchema,
  narratorEntityId: uuid.optional(),
};

// ---- Outline ----------------------------------------------------------------------------------

export const CreateOutlineSchema = z.object({
  topic: z.string().trim().min(1).max(OUTLINE_TOPIC_MAX),
  angleId: z.string().min(1),
  targetWords: z.number().int().min(OUTLINE_MIN_WORDS).max(OUTLINE_MAX_WORDS),
  ...narrationFields,
});
export type CreateOutlineInput = z.infer<typeof CreateOutlineSchema>;

const SourceUsageSchema = z.object({ total: z.number().int(), used: z.number().int(), truncated: z.boolean() });

export const OutlineSectionSchema = z.object({
  id: uuid,
  title: z.string().min(1).max(OUTLINE_TITLE_MAX),
  goal: z.string().max(OUTLINE_GOAL_MAX),
  points: z.array(z.string().max(OUTLINE_POINT_MAX)).max(OUTLINE_POINTS_MAX),
  weight: z.number().int().min(OUTLINE_WEIGHT_MIN).max(OUTLINE_WEIGHT_MAX),
  targetWords: z.number().int().min(0),
});
export type OutlineSection = z.infer<typeof OutlineSectionSchema>;

export const OutlineResponseSchema = z.object({
  sections: z.array(OutlineSectionSchema).min(OUTLINE_MIN_SECTIONS).max(OUTLINE_MAX_SECTIONS),
  promptVersion: z.number().int(),
  sources: SourceUsageSchema,
});
export type OutlineResponse = z.infer<typeof OutlineResponseSchema>;

// ---- Draft one section ------------------------------------------------------------------------

export const DraftOutlineSectionSchema = z.object({
  title: z.string().trim().min(1).max(OUTLINE_TITLE_MAX),
  goal: z.string().trim().max(OUTLINE_GOAL_MAX),
  points: z.array(z.string().trim().min(1).max(OUTLINE_POINT_MAX)).max(OUTLINE_POINTS_MAX),
  targetWords: z.number().int().min(1).max(OUTLINE_MAX_WORDS),
});

export const DraftSectionRequestSchema = z
  .object({
    outline: z.array(DraftOutlineSectionSchema).min(1).max(OUTLINE_MAX_SECTIONS),
    index: z.number().int().min(0),
    tone: ToneSchema,
    angleId: z.string().min(1),
    topic: z.string().trim().min(1).max(OUTLINE_TOPIC_MAX),
    previousText: z.string().max(DRAFT_PREV_MAX_CHARS).optional(),
    remainingChars: z.number().int().min(0).optional(),
    ...narrationFields,
  })
  .refine((v) => v.index < v.outline.length, { message: "index nằm ngoài dàn ý", path: ["index"] });
export type DraftSectionRequest = z.infer<typeof DraftSectionRequestSchema>;

export const LengthStatusSchema = z.enum(["OK", "SHORT", "LONG"]);

export const DraftSectionResponseSchema = z.object({
  paragraphs: z.array(z.string()).min(1),
  wordCount: z.number().int(),
  lengthStatus: LengthStatusSchema,
  exceedsLimit: z.boolean(),
  cleaned: z.boolean(),
  /** Digit runs in the text that are absent from topic, outline, sources and episode (soft warning). */
  novelNumbers: z.array(z.string()),
  promptVersion: z.number().int(),
});
export type DraftSectionResponse = z.infer<typeof DraftSectionResponseSchema>;

// ---- Rewrite ----------------------------------------------------------------------------------

export const RewriteBlockSchema = z.object({
  ref: BlockRefSchema,
  text: z.string().min(1),
  hash: z.string().min(1),
});

const contextText = z.string().max(REWRITE_CONTEXT_MAX_CHARS).optional();

export const RewriteRequestSchema = z
  .object({
    blocks: z.array(RewriteBlockSchema).min(1).max(REWRITE_MAX_BLOCKS),
    contextBefore: contextText,
    contextAfter: contextText,
    instruction: z.string().trim().max(REWRITE_INSTRUCTION_MAX).optional(),
    count: z.number().int().min(1).max(REWRITE_MAX_VARIANTS).default(REWRITE_DEFAULT_VARIANTS),
    tone: ToneSchema.optional(),
  })
  .refine((v) => v.blocks.reduce((sum, b) => sum + b.text.length, 0) <= REWRITE_MAX_CHARS, {
    message: "Đoạn chọn quá dài",
    path: ["blocks"],
  })
  .refine(
    (v) => v.blocks.every((b, i) => i === 0 || Number(b.ref.slice(1)) === Number(v.blocks[i - 1]!.ref.slice(1)) + 1),
    { message: "Các block phải liền nhau", path: ["blocks"] },
  );
export type RewriteRequest = z.infer<typeof RewriteRequestSchema>;

export const RewriteVariantSchema = z.object({
  id: uuid,
  paragraphs: z.array(z.string()).min(1),
  novelNumbers: z.array(z.string()),
});

export const RewriteResponseSchema = z.object({
  variants: z.array(RewriteVariantSchema),
  requested: z.number().int(),
  returned: z.number().int(),
  promptVersion: z.number().int(),
});
export type RewriteResponse = z.infer<typeof RewriteResponseSchema>;
