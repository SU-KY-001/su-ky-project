import { describe, expect, test } from "bun:test";
import type { EditorDocument } from "@repo/shared";
import { chunkSpeech, speechParagraphs } from "../../src/modules/ai-assist/voice/speech-text";

const doc = (content: unknown[]): EditorDocument => ({ type: "doc", content } as EditorDocument);
const para = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const heading = (text: string) => ({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] });

describe("speech text", () => {
  test("headings are not narrated; blank paragraphs dropped", () => {
    expect(speechParagraphs(doc([heading("Tiêu đề"), para("Một."), { type: "paragraph" }, para("Hai.")]), null)).toEqual(["Một.", "Hai."]);
  });

  test("falls back to plain text when there is no document", () => {
    expect(speechParagraphs(null, "A.\n\nB.")).toEqual(["A.", "B."]);
  });

  test("paragraphs are packed up to the limit and never reordered", () => {
    expect(chunkSpeech(["aaaa", "bbbb", "cccc"], 10)).toEqual(["aaaa\n\nbbbb", "cccc"]);
  });

  test("an over-long paragraph splits at sentence ends, not mid-sentence", () => {
    const chunks = chunkSpeech(["Câu một dài. Câu hai dài. Câu ba dài."], 20);
    expect(chunks).toEqual(["Câu một dài.", "Câu hai dài.", "Câu ba dài."]);
    expect(chunkSpeech(["Một câu rất rất dài không có dấu chấm ở giữa"], 10)).toHaveLength(1);
  });
});
