import type { RefObject } from "react";
import { Sparkles } from "lucide-react";
import { DirectScriptComposer } from "./draft/DirectScriptComposer";
import type { RichScriptEditorHandle } from "./RichScriptEditor";

interface Props {
  editorRef: RefObject<RichScriptEditorHandle | null>;
  ensureEpisode: () => Promise<string>;
  wordsPerMinute: number | undefined;
}

export function AiDock({ editorRef, ensureEpisode, wordsPerMinute }: Props) {
  return <div className="min-w-0">
    <header className="border-b border-mod-border px-5 py-3"><h3 className="flex items-center gap-2 text-sm font-bold text-mod-text"><Sparkles size={16} className="text-mod-primary" aria-hidden="true" />Trợ lý AI tạo kịch bản</h3></header>
    {wordsPerMinute === undefined ? <p className="p-5 text-sm text-mod-text-secondary">Đang tải cấu hình thời lượng…</p> : <DirectScriptComposer editorRef={editorRef} ensureEpisode={ensureEpisode} wordsPerMinute={wordsPerMinute} />}
  </div>;
}
