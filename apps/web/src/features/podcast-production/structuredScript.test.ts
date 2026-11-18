import { expect, it } from "bun:test";
import { DialogueSchema } from "@repo/shared";
import { structuredDialogue } from "./structuredScript";
import { legacyScriptToDocument } from "./scriptEditor";
it("retains existing voice keys when appending roles, even after a role was deleted", () => {
  const existing = structuredDialogue("MC: Xin chào\nKhách: Cảm ơn");
  existing.speakers[0]!.key = "S3";
  existing.turns[0]!.speaker = "S3";
  const result = structuredDialogue("Người mới: Tham gia\nMC: Xin chào", existing);
  expect(new Set(result.speakers.map((speaker) => speaker.key)).size).toBe(result.speakers.length);
  expect(result.speakers.find((speaker) => speaker.name === "MC")?.voice).toBe(existing.speakers[0]?.voice);
  expect(DialogueSchema.safeParse(result).success).toBe(true);
});
it("accepts old dialogue payloads and consistent rich content, rejects divergent rich and spoken text", () => {
  const value = structuredDialogue("MC: Xin chào\nKhách: Cảm ơn");
  expect(DialogueSchema.safeParse(value).success).toBe(true);
  value.turns[0]!.document = legacyScriptToDocument("Xin chào");
  expect(DialogueSchema.safeParse(value).success).toBe(true);
  value.turns[0]!.document = legacyScriptToDocument("Nội dung khác");
  expect(DialogueSchema.safeParse(value).success).toBe(false);
});
it("imports every role and turn of a titled multi-speaker script", () => {
  const result = structuredDialogue("THẢO LUẬN LỊCH SỬ\nTHẢO VY: Xin chào\nMINH KHANG: Chào Vy\nKhách mời: Cảm ơn\nMC: Bắt đầu\nthảo vy: Vâng");
  expect(result.speakers).toHaveLength(4);
  expect(result.turns).toHaveLength(5);
  expect(result.turns[0]?.speaker).toBe(result.turns[4]?.speaker);
  expect(result.turns.map((turn) => turn.text)).toEqual(["Xin chào", "Chào Vy", "Cảm ơn", "Bắt đầu", "Vâng"]);
  expect(DialogueSchema.safeParse(result).success).toBe(true);
});
it("rejects over-limit speakers without producing partial dialogue", () => {
  const text = Array.from({ length: 31 }, (_, index) => `Người nói ${index + 1}: Xin chào`).join("\n");
  expect(() => structuredDialogue(text)).toThrow("Số người nói vượt giới hạn");
});
