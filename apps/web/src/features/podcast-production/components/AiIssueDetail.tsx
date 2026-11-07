import type { ReactElement } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import type { AiCheckItem } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { novelHint } from "../aiCheck/novelHint";
import { wordDiff } from "../aiCheck/wordDiff";
import { AI_DOUBT_LABEL } from "../aiCheck/messages";
import { blockNumber, severityLabel } from "../aiCheck/presentation";
import { IssueKindTag } from "./AiIssueList";

export type ApplyNotice = { kind: "conflict" | "error"; text: string } | null;

interface Props {
  item: AiCheckItem;
  /** Current text of the block the item points at; null when it cannot be located (edited, deleted, ambiguous). */
  currentText: string | null;
  /** The text was already replaced but the server was not told yet: apply stays enabled to retry the record only. */
  awaitingRecord?: boolean;
  sourceTitle: (sourceId: string) => string;
  /** Opens the sources popover so the moderator can see the cited source. */
  onOpenSource?: () => void;
  notice: ApplyNotice;
  busy: boolean;
  onApply: () => void;
  onRerunSelection: () => void;
  onBack: () => void;
  onFinish: () => void;
}

/** Every model string is rendered as a React text child (escaped), never as HTML. */
export function AiIssueDetail({ item, currentText, awaitingRecord = false, sourceTitle, notice, busy, onApply, onRerunSelection, onBack, onFinish, onOpenSource }: Props): ReactElement {
  const hint = item.suggestion && currentText ? novelHint(currentText, item.suggestion) : [];
  const showSources = item.kind === "FACT_DOUBT";
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <IssueKindTag item={item} />
          <span className="rounded-full bg-mod-canvas-accent px-2 py-0.5 text-xs font-bold text-mod-text-secondary">{severityLabel(item.severity)}</span>
        </div>
        <span className="shrink-0 text-xs text-mod-text-secondary">Đoạn {blockNumber(item.blockRef)}</span>
      </div>
      <span className="inline-block rounded-full bg-mod-attention/10 px-2 py-0.5 text-xs font-bold text-mod-attention">{AI_DOUBT_LABEL}</span>
      <p className="text-sm text-mod-text">{item.message}</p>

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
          {hint.length ? <p role="note" className="text-xs text-mod-attention">Có số/tên mới: {hint.join(", ")} — hãy kiểm tra.</p> : null}
        </section>
      ) : null}

      {showSources ? (
        item.basis === "CONTRADICTED" ? (
          <section aria-label="Nguồn đối chiếu" className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-mod-text-secondary">Nguồn đối chiếu</h4>
            {item.evidence.map((entry) => (
              <blockquote key={`${entry.sourceId}-${entry.page}-${entry.quote}`} className="rounded-lg border-l-4 border-mod-primary bg-mod-canvas-accent p-3 text-sm">
                “{entry.quote}”
                <footer className="mt-1 text-xs text-mod-text-secondary">
                  {onOpenSource ? (
                    <button type="button" className="underline hover:text-mod-primary" onClick={onOpenSource}>{sourceTitle(entry.sourceId)}{entry.page === null ? "" : `, tr. ${entry.page}`}</button>
                  ) : (
                    <>{sourceTitle(entry.sourceId)}{entry.page === null ? "" : `, tr. ${entry.page}`}</>
                  )}
                </footer>
              </blockquote>
            ))}
          </section>
        ) : (
          <p className="text-sm text-mod-text-secondary">Hệ thống chưa dẫn được câu nguồn nguyên văn cho chỗ này. Điều đó không có nghĩa là sai.</p>
        )
      ) : null}

      {notice ? (
        <div role="alert" className="space-y-1 rounded-lg border border-mod-attention/25 bg-mod-attention/5 p-3 text-sm text-mod-attention">
          <p className="flex items-start gap-2"><TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{notice.text}</p>
          {notice.kind === "conflict" ? <Button type="button" variant="ghost" size="sm" onClick={onRerunSelection}>Chạy lại với đoạn đang chọn</Button> : null}
        </div>
      ) : null}

      {item.appliedAt ? (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-mod-success/25 bg-mod-success/5 p-3 text-sm text-mod-success">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Đã áp dụng vào đoạn này. Bấm <kbd className="font-sans font-bold">Ctrl</kbd>+<kbd className="font-sans font-bold">Z</kbd> trong editor để hoàn tác.</span>
        </p>
      ) : null}

      {item.suggestion && !item.appliedAt ? (
        <Button type="button" variant="outline" disabled={busy || (currentText === null && !awaitingRecord)} onClick={onApply}>Áp dụng đề xuất</Button>
      ) : null}

      <div className="flex justify-between gap-2 border-t border-mod-border pt-3">
        <Button type="button" variant="outline" onClick={onBack}>Quay lại</Button>
        <Button type="button" disabled={busy} onClick={onFinish}>Hoàn tất</Button>
      </div>
    </div>
  );
}
