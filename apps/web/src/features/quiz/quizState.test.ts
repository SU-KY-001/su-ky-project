import { expect, it } from "bun:test";
import { newQuestion, cloneQuestion, moveQuestion, replaceQuestion } from "./quizState";
it("starts without silently choosing the right answer", () => {
  const q = newQuestion(); expect(q.correctIndex).toBeNull(); expect(q.options).toEqual(["", "", "", ""]);
});
it("clones independently and keeps the answer, explanation and evidence", () => {
  const q = { ...newQuestion(), text: "Câu hỏi", correctIndex: 1, evidence: { quote: "Căn cứ", scriptHash: "hash" } };
  const copy = cloneQuestion(q); copy.options[0] = "Khác";
  expect(copy.id).not.toBe(q.id); expect(q.options[0]).toBe(""); expect(copy.correctIndex).toBe(1); expect(copy.evidence).toEqual(q.evidence);
});
it("reorders without losing the selected question identity", () => {
  const a = newQuestion(), b = newQuestion(); const moved = moveQuestion([a, b], a.id, 1);
  expect(moved.map(q => q.id)).toEqual([b.id, a.id]); expect(moveQuestion(moved, a.id, 1)).toEqual(moved);
});
it("regenerates only its target question", () => {
  const a = newQuestion(), b = newQuestion(), generated = newQuestion();
  const next = replaceQuestion([a, b], a.id, generated);
  expect(next[0]).toEqual({ ...generated, id: a.id }); expect(next[1]).toBe(b);
});
