import { describe, expect, it } from "bun:test";
import { EditorDocumentSchema } from "@repo/shared";
import {
  extractCitationSourceIds,
  extractScriptText,
} from "../src/modules/content/application/script-document";

const sourceId = "25289908-06c8-4f12-a6d8-cc194cd260aa";

describe("podcast script document", () => {
  it("preserves spoken block boundaries while excluding citation metadata", () => {
    const document = EditorDocumentSchema.parse({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Mở đầu" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Năm 938" },
            { type: "hardBreak" },
            {
              type: "text",
              text: "trên sông Bạch Đằng",
              marks: [{ type: "sourceCitation", attrs: { sourceId } }],
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Quân Nam Hán thất bại" }],
                },
              ],
            },
          ],
        },
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Đất nước giành lại độc lập" }],
                },
              ],
            },
          ],
        },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Một bước ngoặt lịch sử" }],
            },
          ],
        },
      ],
    });

    expect(extractScriptText(document)).toBe(
      "Mở đầu\nNăm 938\ntrên sông Bạch Đằng\nQuân Nam Hán thất bại\nĐất nước giành lại độc lập\nMột bước ngoặt lịch sử",
    );
    expect(extractCitationSourceIds(document)).toEqual([sourceId]);
  });

  it("accepts the formatting marks produced by the editor", () => {
    const parsed = EditorDocumentSchema.safeParse({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Văn bản có định dạng",
              marks: [
                { type: "bold" },
                { type: "italic" },
                { type: "underline" },
                { type: "sourceCitation", attrs: { sourceId } },
              ],
            },
          ],
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts the start attribute emitted for ordered lists", () => {
    const parsed = EditorDocumentSchema.safeParse({
      type: "doc",
      content: [
        {
          type: "orderedList",
          attrs: { start: 3 },
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Mục thứ ba" }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects raw HTML nodes", () => {
    const parsed = EditorDocumentSchema.safeParse({
      type: "doc",
      content: [{ type: "rawHtml", attrs: { html: "<script>alert(1)</script>" } }],
    });

    expect(parsed.success).toBe(false);
  });
});
