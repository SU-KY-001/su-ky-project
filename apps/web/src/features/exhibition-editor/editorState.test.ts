import { expect, test } from "bun:test";
import { editDocument, undoDocument } from "./editorState";

test("undo restores the preceding document rather than the saved revision", () => {
  const state = { document: { title: "A" }, history: [] };
  const changed = editDocument(state, { title: "B" });
  expect(changed.document.title).toBe("B");
  expect(undoDocument(changed).document.title).toBe("A");
});
