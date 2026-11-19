import type { Editor } from "@tiptap/core";
import { SCRIPT_MAX_CHARACTERS } from "@repo/shared";
import { legacyScriptToDocument } from "./scriptEditor";
import type { EditResult } from "./aiCheck/editorBlocks";

export function importScriptText(editor: Editor, text: string, replace: boolean, expected?: string): EditResult {
  const current = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n", "\n");
  if (replace && expected !== undefined && current !== expected) return { ok: false, reason: "CONFLICT" };
  const normalized = text.normalize("NFC").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return { ok: false, reason: "CONFLICT" };
  if ((replace ? 0 : current.length + 2) + normalized.length > SCRIPT_MAX_CHARACTERS) return { ok: false, reason: "TOO_LONG" };
  const nodes = legacyScriptToDocument(normalized).content ?? [];
  const size = editor.state.doc.content.size;
  return editor.chain().insertContentAt(replace || !current.trim() ? { from: 0, to: size } : size, nodes).run() ? { ok: true } : { ok: false, reason: "CONFLICT" };
}
