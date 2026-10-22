import { useState, type ReactElement } from "react";
import { AI_CHECK_MAX_NOTE_CHARS } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";

export type ReviewScope = "ALL" | "SELECTION";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The selection option is locked when no block is selected. */
  hasSelection: boolean;
  initialScope?: ReviewScope;
  onRun: (scope: ReviewScope, note: string) => void;
}

function Form({ hasSelection, initialScope, onRun }: Pick<Props, "hasSelection" | "initialScope" | "onRun">): ReactElement {
  const [scope, setScope] = useState<ReviewScope>(hasSelection ? (initialScope ?? "ALL") : "ALL");
  const [note, setNote] = useState("");
  return (
    <form
      className="space-y-4 px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        onRun(scope, note.trim());
      }}
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-mod-text">Phạm vi</legend>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="scope" checked={scope === "ALL"} onChange={() => setScope("ALL")} /> Cả kịch bản</label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="scope" checked={scope === "SELECTION"} disabled={!hasSelection} onChange={() => setScope("SELECTION")} /> Đoạn đang chọn
          {hasSelection ? null : <span className="text-xs text-mod-text-secondary">(chọn đoạn trong editor trước)</span>}
        </label>
      </fieldset>
      <label className="block space-y-1 text-sm font-bold text-mod-text">
        Ghi chú cho AI (không bắt buộc)
        <Textarea value={note} maxLength={AI_CHECK_MAX_NOTE_CHARS} rows={3} placeholder="Ví dụ: đây là truyện kể, các lời thoại là hư cấu" onChange={(event) => setNote(event.target.value)} />
      </label>
      <p className="text-xs text-mod-text-secondary">Nội dung các đoạn được rà và ghi chú sẽ được gửi tới nhà cung cấp dịch vụ AI.</p>
      <DialogFooter>
        <Button type="submit">Chạy AI rà kịch bản</Button>
      </DialogFooter>
    </form>
  );
}

export function ScriptReviewConfigDialog({ open, onOpenChange, ...form }: Props): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0">
        <DialogHeader className="border-b border-mod-border px-5 py-4 pr-16">
          <DialogTitle>AI rà kịch bản</DialogTitle>
          <DialogDescription className="text-mod-text-secondary">AI chỉ nêu chỗ đáng ngờ để bạn cân nhắc, không tự sửa kịch bản.</DialogDescription>
        </DialogHeader>
        {open ? <Form {...form} /> : null}
      </DialogContent>
    </Dialog>
  );
}
