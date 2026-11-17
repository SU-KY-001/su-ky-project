import { forwardRef, useImperativeHandle, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { EditorContent, useEditor, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Plugin } from "@tiptap/pm/state";
import { EditorDocumentSchema, DIALOGUE_MAX_SPEAKERS, DIALOGUE_MAX_TURNS, DIALOGUE_TURN_MAX_CHARS, type Dialogue } from "@repo/shared";
import { Users, ChevronDown, Bold, Italic, Undo2, Redo2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/components/ui/popover";
import { legacyScriptToDocument, scriptDocumentText, SourceCitation } from "../scriptEditor";
import type { ScriptImportTarget } from "./ScriptFileImport";
import { addSpeaker } from "../dialogueState";
import { DialogueTurnRow, DialogueSpeakersContext } from "./DialogueTurnRow";

const DialogueDocument = Node.create({ name: "doc", topNode: true, content: "dialogueTurn+" });
const Turn = Node.create({ name: "dialogueTurn", group: "block", content: "(paragraph|heading|bulletList|orderedList|blockquote)+", defining: true,
  addProseMirrorPlugins() { return [new Plugin({ appendTransaction(transactions, _old, state) { if (!transactions.some((transaction) => transaction.docChanged)) return null; const seen = new Set<string>(); const tr = state.tr; state.doc.forEach((node, pos) => { if (node.type.name !== "dialogueTurn") return; const id = String(node.attrs.id); if (!id || seen.has(id)) { const next = crypto.randomUUID(); tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: next }); seen.add(next); } else seen.add(id); }); return tr.docChanged ? tr : null; } })]; },
  addAttributes() { return { id: { default: "" }, speaker: { default: "" }, name: { default: "" }, style: { default: "" }, note: { default: "" } }; },
  addNodeView() { return ReactNodeViewRenderer(DialogueTurnRow); },
  parseHTML() { return [{ tag: 'section[data-dialogue-turn]' }]; },
  renderHTML({ HTMLAttributes }) { return ["section", mergeAttributes(HTMLAttributes, { "data-dialogue-turn": "", "data-speaker-label": HTMLAttributes.name, class: "podcast-dialogue-turn" }), 0]; },
});

export const DialogueRichEditor = forwardRef<ScriptImportTarget, { dialogue: Dialogue; onChange: (value: Dialogue) => void; disabled?: boolean; importControl?: ReactNode }>(function DialogueRichEditor({ dialogue, onChange, disabled = false, importControl }, ref): ReactElement {
  const current = useRef(dialogue); current.current = dialogue;
  const [editorError, setEditorError] = useState("");
  const initial = useRef({ type: "doc", content: dialogue.turns.map((turn) => ({ type: "dialogueTurn", attrs: { id: turn.id, speaker: turn.speaker, name: dialogue.speakers.find((item) => item.key === turn.speaker)?.name ?? "Chưa gán vai", style: turn.style ?? "", note: turn.note ?? "" }, content: (turn.document ?? legacyScriptToDocument(turn.text)).content })) });
  const editor = useEditor({ immediatelyRender: false, editable: !disabled, extensions: [StarterKit.configure({ document: false, link: false, heading: { levels: [1, 2, 3] }, code: false, codeBlock: false, horizontalRule: false, strike: false }), DialogueDocument, SourceCitation, Turn], content: initial.current,
    editorProps: { attributes: { class: "podcast-rich-editor p-0 outline-none text-mod-text leading-7", "aria-label": "Nội dung kịch bản hội thoại" }, handlePaste: (view, event) => { const text = event.clipboardData?.getData("text/plain"); if (text === undefined) return false; event.preventDefault(); const normalized = text.normalize("NFC").replace(/\r\n?/g, "\n"); if (normalized.length > DIALOGUE_TURN_MAX_CHARS) { setEditorError("Đoạn dán vượt 2.000 ký tự. Import file để hệ thống tách thành lượt thoại, hoặc chia nhỏ đoạn dán."); return true; } view.dispatch(view.state.tr.insertText(normalized)); setEditorError(""); return true; } },
    onUpdate: ({ editor: value }) => {
      const turns: Dialogue["turns"] = [];
      const seenIds = new Set<string>();
      value.state.doc.forEach((node) => {
        if (node.type.name !== "dialogueTurn") return;
        const parsed = EditorDocumentSchema.safeParse({ type: "doc", content: node.content.toJSON() });
        if (!parsed.success) { setEditorError("Định dạng không được hỗ trợ. Hoàn tác hoặc dán văn bản thuần trước khi lưu."); return; }
        const document = parsed.data;
        const rawId = String(node.attrs.id);
        const id = rawId && !seenIds.has(rawId) ? rawId : crypto.randomUUID(); seenIds.add(id);
        turns.push({ id, speaker: String(node.attrs.speaker), text: scriptDocumentText(document), style: String(node.attrs.style ?? ""), note: String(node.attrs.note ?? ""), document });
      });
      if (turns.length !== value.state.doc.childCount) return;
      setEditorError(""); onChange({ ...current.current, turns });
    },
  });
  useImperativeHandle(ref, () => ({
    getText: () => current.current.turns.filter((item) => item.text.trim()).map((item) => `${current.current.speakers.find((person) => person.key === item.speaker)?.name ?? "?"}: ${item.text}`).join("\n\n"),
  }), [editor]);
  const addTurn = (): void => { const speaker = current.current.speakers[0]; editor?.chain().focus().insertContentAt(editor.state.doc.content.size, { type: "dialogueTurn", attrs: { id: crypto.randomUUID(), speaker: speaker?.key, name: speaker?.name }, content: [{ type: "paragraph" }] }).run(); };
  return <DialogueSpeakersContext.Provider value={dialogue.speakers}><div className="dialogue-script-editor">
    {!disabled ? <div role="toolbar" aria-label="Công cụ hội thoại" className="dialogue-editor-toolbar mb-5 flex flex-wrap items-center gap-1 rounded-xl border border-mod-border bg-mod-surface p-1.5">
      <Popover><PopoverTrigger asChild><Button type="button" size="sm" variant="ghost" className="h-9 gap-2 rounded-lg px-3 text-mod-text hover:bg-mod-canvas-accent"><Users size={16} className="text-mod-text-secondary" aria-hidden="true" /><span>Người nói</span><span className="rounded-md bg-mod-canvas-accent px-1.5 py-0.5 text-[11px] tabular-nums text-mod-text-secondary">{dialogue.speakers.length}</span><ChevronDown size={13} className="text-mod-text-secondary" aria-hidden="true" /></Button></PopoverTrigger><PopoverContent align="start" className="dialogue-speakers-popover w-[min(360px,calc(100vw-32px))] overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-mod-border px-4 py-3"><h3 className="text-sm font-semibold">Người nói <span className="ml-1 text-xs font-normal text-mod-text-secondary">{dialogue.speakers.length}/{DIALOGUE_MAX_SPEAKERS}</span></h3><Button type="button" size="sm" variant="ghost" disabled={dialogue.speakers.length >= DIALOGUE_MAX_SPEAKERS} onClick={() => { const next = addSpeaker(current.current); current.current = next; onChange(next); }}><Plus size={14} />Thêm</Button></div>
        <div className="dialogue-speakers-scroll max-h-72 overflow-y-auto p-3">
          {dialogue.speakers.map((speaker, index) => { const used = dialogue.turns.filter((turn) => turn.speaker === speaker.key).length; const cannotDelete = dialogue.speakers.length <= 2 || used > 0; return <div key={speaker.key} className="flex items-center gap-2 rounded-lg p-1.5"><span className="w-5 shrink-0 text-center text-xs tabular-nums text-mod-text-secondary">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><Input aria-label={`Tên người nói ${index + 1}`} value={speaker.name} maxLength={40} className="h-9 shadow-none" onChange={(event) => { const next = { ...current.current, speakers: current.current.speakers.map((person) => person.key === speaker.key ? { ...person, name: event.target.value } : person) }; current.current = next; onChange(next); if (editor) { const tr = editor.state.tr; editor.state.doc.forEach((node, pos) => { if (node.attrs.speaker === speaker.key) tr.setNodeMarkup(pos, undefined, { ...node.attrs, name: event.target.value }); }); editor.view.dispatch(tr); } }} /><p className="mt-1 text-[11px] text-mod-text-secondary">{used ? `${used} lượt thoại` : "Chưa có lượt thoại"}</p></div><Button type="button" size="icon-sm" variant="ghost" className="text-mod-text-secondary hover:bg-mod-danger/10 hover:text-mod-danger" aria-label={`Xóa người nói ${speaker.name}`} disabled={cannotDelete} title={used ? "Đổi người nói cho các lượt thoại trước khi xóa" : dialogue.speakers.length <= 2 ? "Hội thoại cần ít nhất 2 người nói" : "Xóa người nói"} onClick={() => { const next = { ...current.current, speakers: current.current.speakers.filter((person) => person.key !== speaker.key) }; current.current = next; onChange(next); }}><Trash2 size={15} /></Button></div>; })}
        </div><p className="border-t border-mod-border px-4 py-2.5 text-xs text-mod-text-secondary">Chọn giọng AI ở bước Giọng đọc.</p>
      </PopoverContent></Popover>
      {importControl}
      <span aria-hidden="true" className="mx-1 h-5 border-l border-mod-border" />
      <div role="group" aria-label="Định dạng lời thoại" className="flex items-center gap-0.5">
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Đậm" title="Đậm" aria-pressed={editor?.isActive("bold") ?? false} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={15} /></Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Nghiêng" title="Nghiêng" aria-pressed={editor?.isActive("italic") ?? false} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={15} /></Button>
      </div>
      <div role="group" aria-label="Lịch sử chỉnh sửa" className="ml-auto flex items-center gap-0.5 border-l border-mod-border pl-2">
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Hoàn tác" title="Hoàn tác" onClick={() => editor?.commands.undo()}><Undo2 size={15} /></Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Làm lại" title="Làm lại" onClick={() => editor?.commands.redo()}><Redo2 size={15} /></Button>
      </div>
    </div> : null}
    <div className="podcast-editor-viewport dialogue-editor-viewport"><EditorContent editor={editor} /></div>
    {!disabled ? <div className="mt-4"><Button type="button" variant="outline" disabled={dialogue.turns.length >= DIALOGUE_MAX_TURNS} onClick={addTurn}><Plus size={16} />Thêm thoại</Button></div> : null}
    {editorError ? <p role="alert" className="border-t border-mod-border p-3 text-sm text-mod-danger">{editorError}</p> : null}
  </div></DialogueSpeakersContext.Provider>;
});
