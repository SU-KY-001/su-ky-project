import { useState, type ReactElement, type RefObject } from "react";
import { PenLine } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { RichScriptEditorHandle } from "../RichScriptEditor";
import { DraftWizardDialog } from "./DraftWizardDialog";

interface Props {
  editorRef: RefObject<RichScriptEditorHandle | null>;
  episodeId: string | null;
  ensureEpisode: () => Promise<string>;
  /** Undefined until the script config loads; drafting needs it to turn minutes into words. */
  wordsPerMinute: number | undefined;
  scriptChars: number;
}

/** The two compose entries of the Trợ lý AI panel: "Soạn bản nháp" (wizard) and "Viết lại đoạn" (explained; opened by selecting text). */
export function ComposeCards({ editorRef, episodeId, ensureEpisode, wordsPerMinute, scriptChars }: Props): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 space-y-4 border-t border-mod-border pt-4">
      <section className="space-y-2" aria-label="Soạn bản nháp">
        <h4 className="text-base font-bold text-mod-text">Soạn bản nháp</h4>
        <p className="text-sm text-mod-text-secondary">AI soạn dàn ý rồi viết từng phần theo đề bài, góc kể và giọng văn bạn chọn. Không có gì vào kịch bản cho tới khi bạn bấm Chèn.</p>
        <Button type="button" variant="outline" disabled={wordsPerMinute === undefined} onClick={() => setOpen(true)}>
          <PenLine size={16} aria-hidden="true" /> Soạn bản nháp
        </Button>
      </section>
      <section className="space-y-1" aria-label="Viết lại đoạn">
        <h4 className="text-base font-bold text-mod-text">Viết lại đoạn</h4>
        <p className="text-sm text-mod-text-secondary">Bôi đen phần bạn muốn viết lại trong editor. Nút “Viết lại” sẽ hiện ngay cạnh phần bôi đen.</p>
        <p className="text-xs text-mod-text-secondary">AI chỉ đổi cách nói. Nếu bản viết lại có số hoặc tên mới, thẻ sẽ hiện cảnh báo nhẹ để bạn tự kiểm tra; bản đó vẫn chọn được.</p>
      </section>
      {wordsPerMinute !== undefined ? (
        <DraftWizardDialog open={open} onOpenChange={setOpen} editorRef={editorRef} episodeId={episodeId} ensureEpisode={ensureEpisode} wordsPerMinute={wordsPerMinute} scriptChars={scriptChars} />
      ) : null}
    </div>
  );
}
