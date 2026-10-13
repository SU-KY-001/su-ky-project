import { z } from "zod";

export const EditorMarkSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }).strict(),
  z.object({ type: z.literal("italic") }).strict(),
  z.object({ type: z.literal("underline") }).strict(),
  z
    .object({
      type: z.literal("sourceCitation"),
      attrs: z.object({ sourceId: z.string().uuid() }).strict(),
    })
    .strict(),
]);

export type EditorMark = z.infer<typeof EditorMarkSchema>;

export type EditorTextNode = {
  type: "text";
  text: string;
  marks?: EditorMark[];
};

export type EditorHardBreakNode = { type: "hardBreak" };

export type EditorNode =
  | EditorTextNode
  | EditorHardBreakNode
  | {
      type: "paragraph";
      content?: EditorNode[];
    }
  | {
      type: "heading";
      attrs: { level: 1 | 2 | 3 };
      content?: EditorNode[];
    }
  | {
      type: "bulletList" | "listItem" | "blockquote";
      content: EditorNode[];
    }
  | {
      type: "orderedList";
      attrs?: { start: number };
      content: EditorNode[];
    };

export type EditorInlineNode = EditorTextNode | EditorHardBreakNode;
export type EditorBlockNode = Exclude<EditorNode, EditorInlineNode | { type: "listItem" }>;

export type EditorDocument = {
  type: "doc";
  content?: EditorNode[];
};

const EditorNodeSchema: z.ZodType<EditorNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z
      .object({
        type: z.literal("text"),
        text: z.string(),
        marks: z.array(EditorMarkSchema).optional(),
      })
      .strict(),
    z.object({ type: z.literal("hardBreak") }).strict(),
    z
      .object({
        type: z.literal("paragraph"),
        content: z.array(EditorNodeSchema).optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("heading"),
        attrs: z.object({ level: z.union([z.literal(1), z.literal(2), z.literal(3)]) }).strict(),
        content: z.array(EditorNodeSchema).optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("bulletList"),
        content: z.array(EditorNodeSchema),
      })
      .strict(),
    z
      .object({
        type: z.literal("orderedList"),
        attrs: z.object({ start: z.number().int().positive() }).strict().optional(),
        content: z.array(EditorNodeSchema),
      })
      .strict(),
    z
      .object({
        type: z.literal("listItem"),
        content: z.array(EditorNodeSchema),
      })
      .strict(),
    z
      .object({
        type: z.literal("blockquote"),
        content: z.array(EditorNodeSchema),
      })
      .strict(),
  ]),
);

function validateNodeChildren(node: EditorNode, ctx: z.RefinementCtx): void {
  if (node.type === "text" || node.type === "hardBreak") return;

  const children = node.content ?? [];
  const allowed =
    node.type === "paragraph" || node.type === "heading"
      ? new Set(["text", "hardBreak"])
      : node.type === "bulletList" || node.type === "orderedList"
        ? new Set(["listItem"])
        : node.type === "listItem"
          ? new Set(["paragraph", "bulletList", "orderedList"])
          : new Set(["paragraph", "bulletList", "orderedList"]);

  for (const child of children) {
    if (!allowed.has(child.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${child.type} is not allowed inside ${node.type}`,
      });
    }
    validateNodeChildren(child, ctx);
  }
}

export const EditorDocumentSchema: z.ZodType<EditorDocument> = z
  .object({
    type: z.literal("doc"),
    content: z.array(EditorNodeSchema).optional(),
  })
  .strict()
  .superRefine((document, ctx) => {
    for (const node of document.content ?? []) {
      if (!new Set(["paragraph", "heading", "bulletList", "orderedList", "blockquote"]).has(node.type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${node.type} is not allowed inside doc`,
        });
      }
      validateNodeChildren(node, ctx);
    }
  });

export const AudioAnalysisSchema = z
  .object({
    clientDurationMs: z.number().int().nonnegative().nullable(),
    estimatedScriptDurationMs: z.number().int().nonnegative(),
    durationRatio: z.number().nonnegative().nullable(),
    noiseLevelDb: z.number().finite().nullable(),
    formatStatus: z.enum(["PASS", "WARNING", "UNKNOWN"]),
    durationStatus: z.enum(["PASS", "WARNING", "UNKNOWN"]),
    noiseStatus: z.enum(["PASS", "WARNING", "UNKNOWN"]),
    checkedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type AudioAnalysis = z.infer<typeof AudioAnalysisSchema>;

