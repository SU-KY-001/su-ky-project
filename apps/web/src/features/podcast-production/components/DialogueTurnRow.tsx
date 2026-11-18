import { createContext, useContext, type ReactElement } from "react";
import { NodeViewWrapper, NodeViewContent, useEditorState, type NodeViewProps } from "@tiptap/react";
import type { Dialogue } from "@repo/shared";
import { Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";

export const DialogueSpeakersContext = createContext<Dialogue["speakers"]>([]);

export function DialogueTurnRow({ node, editor, updateAttributes, deleteNode }: NodeViewProps): ReactElement {
  const speakers = useContext(DialogueSpeakersContext);
  const id = String(node.attrs.id);
  const index = useEditorState({ editor, selector: ({ editor: current }) => { let found = 0; current.state.doc.forEach((item, _pos, at) => { if (item.attrs.id === id) found = at; }); return found; } });
  return <NodeViewWrapper as="section" className="dialogue-turn-row" data-dialogue-turn="" data-turn-id={id} data-speaker-label={String(node.attrs.name ?? "")}>
    <span contentEditable={false} className="dialogue-turn-number">{String(index + 1).padStart(2, "0")}</span>
    <div contentEditable={false} className="dialogue-turn-speaker"><ModeratorSelect label={`Người nói lượt ${index + 1}`} value={String(node.attrs.speaker)} disabled={!editor.isEditable} placeholder="Chọn người nói" options={speakers.map((speaker) => ({ value: speaker.key, label: speaker.name }))} onValueChange={(speaker) => updateAttributes({ speaker, name: speakers.find((item) => item.key === speaker)?.name ?? "" })} /></div>
    <div className="min-w-0">
      <NodeViewContent className="dialogue-turn-content" data-empty={!node.textContent.trim()} />
    </div>
    {editor.isEditable ? <div contentEditable={false} className="dialogue-turn-actions"><Button type="button" size="icon-sm" variant="ghost" className="text-mod-text-secondary hover:bg-mod-danger/10 hover:text-mod-danger" aria-label={`Xóa lượt ${index + 1}`} title="Xóa lượt thoại" disabled={editor.state.doc.childCount <= 1} onClick={deleteNode}><Trash2 size={16} /></Button></div> : <span />}
  </NodeViewWrapper>;
}
