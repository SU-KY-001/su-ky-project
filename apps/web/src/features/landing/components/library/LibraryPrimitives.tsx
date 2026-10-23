import type { ReactElement, ReactNode } from "react";
import { ArrowClockwise, BookOpen, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function LibrarySection({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }): ReactElement {
  return <section id={id} aria-labelledby={`${id}-title`} className="library-section scroll-mt-28 py-12 md:py-16"><header className="mb-8 max-w-2xl"><h2 id={`${id}-title`} className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">{title}</h2>{description && <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>}</header>{children}</section>;
}

export function LibraryState({ loading, error, title, description, retry }: { loading?: boolean; error?: boolean; title?: string; description?: string; retry?: () => void }): ReactElement {
  if (loading) return <div role="status" aria-label="Đang tải nội dung thư viện" className="space-y-4 py-8"><Skeleton className="h-32 w-full bg-paper-deep/60" /><Skeleton className="h-3 w-2/3 bg-paper-deep/60" /><span className="sr-only">Đang tải…</span></div>;
  return <div role={error ? "alert" : "status"} className="flex min-h-44 flex-col items-start justify-center gap-3 rounded-lg border border-line/80 bg-paper/40 p-6 md:p-8"><BookOpen size={26} className="text-bronze-dark" aria-hidden="true" /><h3 className="font-medium">{title ?? (error ? "Chưa tải được nội dung" : "Một chương mới đang được chuẩn bị")}</h3>{description && <p className="max-w-lg text-sm leading-7 text-muted-foreground">{description}</p>}{error && retry && <Button variant="outline" size="sm" onClick={retry}><ArrowClockwise aria-hidden="true" /> Thử lại</Button>}</div>;
}

export function LibrarySelect({ id, label, value, onChange, options, disabled = false, allLabel = "Tất cả" }: { id: string; label: string; value: string; onChange: (value: string) => void; options: { id: string; name: string }[]; disabled?: boolean; allLabel?: string }): ReactElement {
  return <div className="flex min-w-0 flex-col gap-2"><Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label><Select value={value || "all"} onValueChange={(selected) => onChange(selected === "all" ? "" : selected)} disabled={disabled}><SelectTrigger id={id} className="bg-paper-soft"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{allLabel}</SelectItem>{options.map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent></Select></div>;
}

export function LibraryPages({ page, limit, total, onChange }: { page: number; limit: number; total: number; onChange: (value: number) => void }): ReactElement | null {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return <nav aria-label="Phân trang thư viện" className="mt-7 flex items-center justify-end gap-3"><span className="text-xs text-muted-foreground">Trang {page} / {pages}</span><Button variant="outline" size="icon-sm" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Trang trước"><CaretLeft /></Button><Button variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Trang sau"><CaretRight /></Button></nav>;
}
