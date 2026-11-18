import { afterEach, expect, test } from "bun:test";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { SCRIPT_MAX_CHARACTERS } from "@repo/shared";
import { importScriptText } from "./scriptImport";
const editors: Editor[] = [];
afterEach(() => { editors.forEach((editor) => editor.destroy()); editors.length = 0; });
function editor(): Editor { const value = new Editor({ extensions: [StarterKit], content: "<p>Nội dung cũ</p>" }); editors.push(value); return value; }
test("imports plain text literally and keeps existing paragraphs on append", () => {
  const value = editor();
  expect(importScriptText(value, "<script>alert(1)</script>\n\nĐoạn hai", false).ok).toBe(true);
  expect(value.getText()).toContain("Nội dung cũ");
  expect(value.getText()).toContain("<script>alert(1)</script>");
  expect(value.view.dom.querySelector("script")).toBeNull();
});
test("replaces only the expected revision and allows undo", () => {
  const value = editor();
  expect(importScriptText(value, "Mới", true, "không khớp")).toEqual({ ok: false, reason: "CONFLICT" });
  expect(importScriptText(value, "Mới", true, "Nội dung cũ").ok).toBe(true);
  expect(value.getText()).toBe("Mới");
  value.commands.undo();
  expect(value.getText()).toBe("Nội dung cũ");
});
test("rejects oversized input without partial insertion", () => {
  const value = editor();
  expect(importScriptText(value, "a".repeat(SCRIPT_MAX_CHARACTERS + 1), true)).toEqual({ ok: false, reason: "TOO_LONG" });
  expect(value.getText()).toBe("Nội dung cũ");
});
