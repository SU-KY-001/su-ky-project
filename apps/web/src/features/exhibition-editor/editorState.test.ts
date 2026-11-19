import { expect, test } from "bun:test";
import { editDocument, undoDocument, mergeArtworkBuffers } from "./editorState";

test("undo restores the preceding document rather than the saved revision", () => {
  const state = { document: { title: "A" }, history: [] };
  const changed = editDocument(state, { title: "B" });
  expect(changed.document.title).toBe("B");
  expect(undoDocument(changed).document.title).toBe("A");
});

test("keeps several incomplete artworks while the user switches to another artwork", () => {
  const saved = [{ id: "saved", title: "Ảnh đã lưu" }];
  const first = { id: "first", title: "" };
  const second = { id: "second", title: "Đang nhập" };
  expect(mergeArtworkBuffers(saved, [first], second).map(item => item.id)).toEqual(["saved", "first", "second"]);
  const restored = mergeArtworkBuffers(saved, [first, second], { ...first, title: "Ảnh thứ nhất" });
  expect(restored.find(item => item.id === "first")?.title).toBe("Ảnh thứ nhất");
  expect(restored.find(item => item.id === "second")?.title).toBe("Đang nhập");
  expect(saved).toEqual([{ id: "saved", title: "Ảnh đã lưu" }]);
});
