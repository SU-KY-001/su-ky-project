import { describe, expect, it } from "bun:test";
import {
  citationMark,
  emptyScriptDocument,
  isScriptDocumentEmpty,
  legacyScriptToDocument,
  scriptCharacterCount,
  scriptDocumentText,
} from "./scriptEditor";

describe("podcast script editor utilities", () => {
  it("recognizes empty documents including whitespace-only paragraphs", () => {
    expect(isScriptDocumentEmpty(emptyScriptDocument())).toBe(true);
    expect(
      isScriptDocumentEmpty({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "   " }] },
        ],
      }),
    ).toBe(true);
  });

  it("counts characters from spoken text rather than citation metadata", () => {
    const document = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph" as const,
          content: [
            {
              type: "text" as const,
              text: "Năm 938",
              marks: [
                citationMark("25289908-06c8-4f12-a6d8-cc194cd260aa"),
              ],
            },
          ],
        },
      ],
    };

    expect(scriptDocumentText(document)).toBe("Năm 938");
    expect(scriptCharacterCount(document)).toBe(7);
  });

  it("builds the source citation mark payload accepted by the API", () => {
    expect(citationMark("25289908-06c8-4f12-a6d8-cc194cd260aa")).toEqual({
      type: "sourceCitation",
      attrs: { sourceId: "25289908-06c8-4f12-a6d8-cc194cd260aa" },
    });
  });

  it("converts legacy plain text to paragraphs on first load", () => {
    const document = legacyScriptToDocument("Mở đầu\n\nDiễn biến\nKết thúc");

    expect(document).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Mở đầu" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Diễn biến" },
            { type: "hardBreak" },
            { type: "text", text: "Kết thúc" },
          ],
        },
      ],
    });
  });
});
