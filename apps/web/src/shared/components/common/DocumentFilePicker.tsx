import { useRef, useState, type ReactElement } from "react";
import { UploadSimple } from "@phosphor-icons/react/dist/icons/UploadSimple";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

/** Shared by quiz import and script import; the caller owns parsing, preview and apply semantics. */
export function DocumentFilePicker({ label, onFiles, disabled = false }: { label: string; onFiles: (files: File[]) => void; disabled?: boolean }): ReactElement {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return <div role="group" aria-label={label} className={cn("flex min-h-60 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-mod-border p-6 text-center", dragging && "border-mod-text-low bg-mod-canvas-accent")}
    onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!disabled) onFiles(Array.from(event.dataTransfer.files)); }}>
    <UploadSimple className="size-8 text-mod-text-low" aria-hidden="true" /><p className="text-sm font-semibold text-mod-text">{label}</p>
    <p className="text-xs leading-6 text-mod-text-secondary">DOC, DOCX, PDF có văn bản, TXT, MD · Tối đa 5 MB</p>
    <Button autoFocus type="button" variant="outline" disabled={disabled} onClick={() => input.current?.click()}>Chọn tệp</Button>
    <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label={label} accept=".doc,.docx,.pdf,.txt,.md" disabled={disabled} onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; onFiles(files); }} />
  </div>;
}
