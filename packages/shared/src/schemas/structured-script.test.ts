import { expect, test } from "bun:test";
import { analyzeStructuredScript, normalizeStructuredScriptText } from "./structured-script";
test("recognizes named turns and continuation lines without inventing roles", () => {
  const result = analyzeStructuredScript("MC: Xin chào\nTiếp lời.\nKhách mời: Cảm ơn\nMC: Bắt đầu nhé");
  expect(result.kind).toBe("dialogue");
  expect(result.turns.map((turn) => turn.speaker)).toEqual(["MC", "Khách mời", "MC"]);
  expect(result.turns[0]?.text).toContain("Tiếp lời.");
});
test("narrative colons, times and URLs are not dialogue labels", () => {
  expect(analyzeStructuredScript("Năm 1975 có các sự kiện:\nNội dung kể chuyện.\nhttps://example.com\n12:30 bắt đầu.").kind).toBe("monologue");
});
test("accepts one narrator as monologue and flags unassigned dialogue introductions", () => {
  expect(analyzeStructuredScript("MC: Xin chào").kind).toBe("monologue");
  expect(analyzeStructuredScript("Lời dẫn chưa gán vai\nMC: Chào\nKhách: Chào").kind).toBe("ambiguous");
});
test("does not interpret a DOCX type declaration as a speaker or spoken content", () => {
  const input = "[LOẠI KỊCH BẢN: PODCAST ĐỘC THOẠI]\n\nTRẬN BẠCH ĐẰNG NĂM 938\n\nHãy nhắm mắt lại một chút.\n\nXin chào và tạm biệt!";
  const result = analyzeStructuredScript(input);
  expect(result.kind).toBe("monologue");
  expect(result.turns).toEqual([]);
  expect(result.issues).toEqual([]);
  expect(normalizeStructuredScriptText(input)).toBe("TRẬN BẠCH ĐẰNG NĂM 938\n\nHãy nhắm mắt lại một chút.\n\nXin chào và tạm biệt!");
});
test("uses actual speaker structure even when a declaration claims monologue", () => {
  expect(analyzeStructuredScript("[LOẠI KỊCH BẢN: PODCAST ĐỘC THOẠI]\nMC: Chào\nKhách mời: Cảm ơn").kind).toBe("dialogue");
  expect(analyzeStructuredScript("[LOẠI KỊCH BẢN: PODCAST HỘI THOẠI]\nMC: Chào\nKhách mời: Cảm ơn").kind).toBe("dialogue");
});
test("does not silently attribute an unrecognized role to the previous speaker", () => {
  const result = analyzeStructuredScript("MC: Xin chào\nLan: Cảm ơn\nnam: Tôi cũng tham gia");
  expect(result.kind).toBe("ambiguous");
  expect(result.issues.join(" ")).toContain("nam");
});
test.each([2, 3, 5, 10, 30])("recognizes a heading followed by %i speakers as dialogue", (count) => {
  const result = analyzeStructuredScript("[LOẠI KỊCH BẢN: PODCAST HỘI THOẠI]\nCÀ PHÊ SÀI GÒN XƯA – CHUYỆN BÊN LY CÀ PHÊ\n\n" + Array.from({ length: count }, (_, index) => `Người nói ${index + 1}: Nội dung lượt ${index + 1}.`).join("\n"));
  expect(result.kind).toBe("dialogue");
  expect(result.title).toBe("CÀ PHÊ SÀI GÒN XƯA – CHUYỆN BÊN LY CÀ PHÊ");
  expect(result.unassigned).toBe("");
  expect(result.issues).toEqual([]);
  expect(new Set(result.turns.map((turn) => turn.speaker)).size).toBe(count);
});
test("normalizes capitalization of known speakers without creating new roles", () => {
  const result = analyzeStructuredScript("THẢO VY: Xin chào\nMINH KHANG: Cảm ơn\nKhách mời: Chào mọi người\nthảo vy: Tiếp tục nhé\nminh khang: Vâng");
  expect(result.kind).toBe("dialogue");
  expect(new Set(result.turns.map((turn) => turn.speaker)).size).toBe(3);
});
test("keeps real unassigned prose and empty turns as errors even with a heading", () => {
  expect(analyzeStructuredScript("TIÊU ĐỀ KỊCH BẢN\nLời mở chưa gán người đọc.\nMC: Chào\nKhách: Cảm ơn\nNgười nói 3: Vâng").kind).toBe("ambiguous");
  expect(analyzeStructuredScript("TIÊU ĐỀ KỊCH BẢN\nMC: Chào\nKhách:\nNgười nói 3: Vâng").issues).toContain("Có lượt thoại chưa có lời.");
});
