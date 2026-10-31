import { afterEach, describe, expect, it } from "bun:test";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import type { EditorDocument } from "@repo/shared";
import { extractBlocks } from "./blockRefs";
import { editorBlocks, replaceBlockText, selectionBlocks } from "./editorBlocks";

const doc: EditorDocument = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Mở đầu" }] },
    { type: "paragraph" },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "ý một" }] }] }] },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "trích" }] }] },
    { type: "paragraph", content: [{ type: "text", text: "dòng a" }, { type: "hardBreak" }, { type: "text", text: "dòng b" }] },
    { type: "paragraph", content: [{ type: "text", text: "cuối" }] },
  ],
};

let editor: Editor;
const make = () => (editor = new Editor({ element: document.createElement("div"), extensions: [StarterKit], content: doc }));
afterEach(() => editor?.destroy());

describe("editor handle blocks", () => {
  it("numbers blocks exactly like the pure JSON extraction", () => {
    expect(editorBlocks(make())).toEqual(extractBlocks(doc));
  });

  it("replaces one block in a single undoable step and keeps the neighbours", () => {
    make();
    const target = editorBlocks(editor)[3]!;
    expect(replaceBlockText(editor, target.ref, target.hash, "mới a\nmới b")).toBe("ok");
    expect(editorBlocks(editor).map((b) => b.text)).toEqual(["Mở đầu", "ý một", "trích", "mới a\nmới b", "cuối"]);
    editor.commands.undo();
    expect(editorBlocks(editor)[3]!.text).toBe("dòng a\ndòng b");
  });

  it("refuses to overwrite a block whose text changed since the AI saw it", () => {
    make();
    const target = editorBlocks(editor)[4]!;
    expect(replaceBlockText(editor, target.ref, "stale-hash", "ghi đè")).toBe("conflict");
    expect(editorBlocks(editor)[4]!.text).toBe("cuối");
    expect(replaceBlockText(editor, "b99", target.hash, "x")).toBe("conflict");
  });

  it("selection blocks keep absolute refs", () => {
    make();
    const all = editorBlocks(editor);
    const end = editor.state.doc.content.size;
    editor.commands.setTextSelection({ from: end - 2, to: end - 1 });
    expect(selectionBlocks(editor).map((b) => b.ref)).toEqual([all[4]!.ref]);
  });
});
