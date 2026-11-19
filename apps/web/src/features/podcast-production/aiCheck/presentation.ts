import type { AiCheck, AiCheckItem } from "@repo/shared";
import { locateBlock, type ScriptBlock } from "./blockRefs";
import type { BlockHighlight } from "./blockHighlights";

export type IssueTone = "danger" | "info" | "muted";

export interface IssueLabel {
  text: string;
  tone: IssueTone;
}

const MS_PER_SECOND = 1000;
const REF_PREFIX_LENGTH = 1;
export const CONFLICT_TEXT = "Đoạn đã đổi, chạy lại. Hệ thống không ghi đè chữ của bạn.";

/** READABILITY wins over basis: a reading problem has no "source" to be missing from. */
export function issueLabel(item: Pick<AiCheckItem, "kind" | "basis">): IssueLabel {
  if (item.kind === "READABILITY") return { text: "Đọc thành tiếng", tone: "info" };
  if (item.basis === "NOT_FOUND") return { text: "Chưa thấy trong nguồn", tone: "muted" };
  return { text: "Nghi sai", tone: "danger" };
}

const SEVERITY_LABEL: Record<AiCheckItem["severity"], string> = { HIGH: "Mức cao", MEDIUM: "Mức vừa", LOW: "Mức thấp" };

export const severityLabel = (severity: AiCheckItem["severity"]): string => SEVERITY_LABEL[severity];

/** `b0` is the first block: people count paragraphs from 1. */
export const blockNumber = (ref: string): number => Number(ref.slice(REF_PREFIX_LENGTH)) + 1;

/** The model sometimes ends a message with its own "AI nghi ngờ…" disclaimer; the panel already shows that label. */
export function stripDoubtTail(message: string): string {
  const cut = message.search(/\s*AI nghi ngờ/i);
  return (cut > 0 ? message.slice(0, cut) : message).trim() || message;
}

/** The yellow "block changed" box never shows for an applied item: its text differs from the snapshot by design. */
export function conflictNoticeText(item: Pick<AiCheckItem, "suggestion" | "appliedAt">, located: string): string | null {
  return item.suggestion && !item.appliedAt && located === "conflict" ? CONFLICT_TEXT : null;
}

export function seenSummary(items: readonly Pick<AiCheckItem, "status">[]): string {
  const seen = items.filter((item) => item.status === "REVIEWED").length;
  return `${seen} đã xem, ${items.length - seen} chưa xem`;
}

/** Pages the AI quoted as evidence; the check does not store which pages it merely opened. */
export function citedPages(items: readonly Pick<AiCheckItem, "evidence">[]): number[] {
  const pages = new Set<number>();
  for (const item of items) for (const entry of item.evidence) if (entry.page !== null) pages.add(entry.page);
  return [...pages].sort((a, b) => a - b);
}

export function traceLine(check: Pick<AiCheck, "toolCalls" | "startedAt" | "finishedAt">, items: readonly Pick<AiCheckItem, "evidence">[]): string {
  const pages = citedPages(items);
  const where = pages.length ? `dẫn tr. ${pages.join(", ")}` : "không dẫn trang nào";
  const took = check.finishedAt ? `, mất ${((check.finishedAt.getTime() - check.startedAt.getTime()) / MS_PER_SECOND).toFixed(1)} giây` : "";
  return `AI đã tra nguồn ${check.toolCalls} lần, ${where}${took}.`;
}

export function savedAtLabel(at: Date): string {
  return `Đã lưu ${at.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

/**
 * Orange = warning waiting, green = applied, blue = the one open in the panel (wins over the other two).
 * An applied block no longer matches its snapshot hash, so it is found by its slot instead of by `locateBlock`.
 */
export function blockHighlights(items: readonly AiCheckItem[], blocks: ScriptBlock[], openId: string | null): BlockHighlight[] {
  const byRef = new Map<string, BlockHighlight["kind"]>();
  for (const item of items) {
    const located = locateBlock(blocks, item);
    const ref = located === "conflict" ? (item.appliedAt ? item.blockRef : null) : located;
    if (!ref) continue;
    const kind = item.id === openId ? "current" : item.appliedAt ? "applied" : "flag";
    const previous = byRef.get(ref);
    if (previous === "current" || (previous === "flag" && kind === "applied")) continue;
    byRef.set(ref, kind);
  }
  return [...byRef].map(([ref, kind]) => ({ ref, kind }));
}

export const IDLE_DESCRIPTION =
  "AI đọc kịch bản và nhắc chỗ có thể sai sự thật, chỗ khó đọc thành tiếng hoặc mạch chưa liền. Đó chỉ là cảnh báo nhẹ. Bạn quyết định, AI không tự sửa.";

