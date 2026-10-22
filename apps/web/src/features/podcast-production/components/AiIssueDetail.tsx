import type { ReactElement } from "react";
import type { AiCheckItem } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { novelHint } from "../aiCheck/novelHint";
import { wordDiff } from "../aiCheck/wordDiff";
import { AI_DOUBT_LABEL } from "../aiCheck/messages";

export type ApplyNotice = { kind: "conflict" | "error"; text: string } | null;

interface Props {
  item: AiCheckItem;
  /** Current text of the block the item points at; null when it cannot be located (edited, deleted, ambiguous). */
  currentText: string | null;
  sourceTitle: (sourceId: string) => string;
  notice: ApplyNotice;
  busy: boolean;
  onApply: () => void;
  onRerunSelection: () => void;
  onBack: () => void;
  onFinish: () => void;
}

/** Every model string is rendered as a React text child (escaped), never as HTML. */
export function AiIssueDetail({ item, currentText, sourceTitle, notice, busy, onApply, onRerunSelection, onBack, onFinish }: Props): ReactElement {
  const hint = item.suggestion && currentText ? novelHint(currentText, item.suggestion) : [];
  return (
    <div className="space-y-4">
      <p className="text-xs font-bold text-mod-attention">{AI_DOUBT_LABEL}</p>
      <p className="text-sm text-mod-text">{item.message}</p>

      {item.basis === "CONTRADICTED" ? (
        <section aria-label="Nguồn đối chiếu" className="space-y-2">
          <h4 className="text-xs font-bold uppercase text-mod-text-secondary">Nguồn đối chiếu</h4>
          {item.evidence.map((entry) => (
            <blockquote key={`${entry.sourceId}-${entry.page}-${entry.quote}`} className="rounded-lg border-l-4 border-mod-primary bg-mod-canvas-accent p-3 text-sm">
              “{entry.quote}”
              <footer className="mt-1 text-xs text-mod-text-secondary">{sourceTitle(entry.sourceId)} · trang {entry.page}</footer>
            </blockquote>
          ))}
        </section>
      ) : (
        <p className="text-sm text-mod-text-secondary">Hệ thống chưa dẫn được câu nguồn nguyên văn cho chỗ này. Điều đó không có nghĩa là sai.</p>
      )}

      {item.suggestion ? (
        <section aria-label="Đề xuất sửa" className="space-y-2">
          <h4 className="text-xs font-bold uppercase text-mod-text-secondary">Đề xuất sửa</h4>
          <p className="rounded-lg border border-mod-border p-3 text-sm leading-6">
            {currentText === null
              ? item.suggestion
              : wordDiff(currentText, item.suggestion).map((part, index) =>
                  part.kind === "same" ? <span key={index}>{part.text}</span> : part.kind === "add" ? <ins key={index} className="bg-mod-success/15 no-underline">{part.text}</ins> : <del key={index} className="bg-mod-danger/15">{part.text}</del>,
                )}
          </p>
          {hint.length ? <p role="note" className="text-xs text-mod-warning">Có số/tên mới: {hint.join(", ")} — hãy kiểm tra.</p> : null}
          {item.appliedAt ? (
            <p className="text-xs font-semibold text-mod-success">Đã áp dụng</p>
          ) : (
            <Button type="button" variant="outline" size="sm" disabled={busy || currentText === null} onClick={onApply}>Áp dụng đề xuất</Button>
          )}
        </section>
      ) : null}

      {notice ? (
        <div role="alert" className={notice.kind === "conflict" ? "text-sm text-mod-warning" : "text-sm text-mod-danger"}>
          <p>{notice.text}</p>
          {notice.kind === "conflict" ? <Button type="button" variant="ghost" size="sm" onClick={onRerunSelection}>Chạy lại với đoạn đang chọn</Button> : null}
        </div>
      ) : null}

      <div className="flex justify-between gap-2 border-t border-mod-border pt-3">
        <Button type="button" variant="outline" onClick={onBack}>Quay lại</Button>
        <Button type="button" disabled={busy} onClick={onFinish}>Hoàn tất</Button>
      </div>
    </div>
  );
}
