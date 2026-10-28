import { useState, type ReactElement } from "react";
import type { Dialogue, DialogueSpeakerKey } from "@repo/shared";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { dialogueSegments } from "../dialogueState";

type RoleFilter = DialogueSpeakerKey | "ALL";

const speakerDot: Record<DialogueSpeakerKey, string> = { A: "bg-mod-text", B: "bg-mod-primary" };

/**
 * Read-along sheet for two people recording outside the system: each turn with its tone, stage directions and note.
 * Choosing a role dims (and, when printed, hides) the other person's turns. The recorded file is uploaded below it.
 */
export function DialogueRecordingSheet({ dialogue }: { dialogue: Dialogue }): ReactElement {
  const [role, setRole] = useState<RoleFilter>("ALL");
  const roles: { key: RoleFilter; label: string }[] = [{ key: "ALL", label: "Cả hai" }, ...dialogue.speakers.map((speaker) => ({ key: speaker.key, label: speaker.name }))];
  const nameOf = (key: DialogueSpeakerKey): string => dialogue.speakers.find((speaker) => speaker.key === key)!.name;

  return (
    <section aria-labelledby="recording-sheet-title" className="space-y-3 print:space-y-2">
      <style>{"@media print { body * { visibility: hidden } #recording-sheet, #recording-sheet * { visibility: visible } #recording-sheet { position: absolute; inset: 0 } [data-dimmed='true'] { display: none } .print-hidden { display: none } }"}</style>
      <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="recording-sheet-title" className="font-bold text-mod-text">Bản đọc theo vai</h3>
          <p className="mt-1 text-sm text-mod-text-secondary">Chọn tên của bạn để lượt của mình nổi bật. Thu ngoài hệ thống, mỗi người một track nếu có thể, rồi trộn thành một file và tải lên bên dưới.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}><Printer aria-hidden="true" /> In / lưu PDF</Button>
      </div>
      <div role="group" aria-label="Vai đọc" className="print-hidden inline-flex rounded-lg border border-mod-border p-0.5">
        {roles.map((item) => (
          <button key={item.key} type="button" aria-pressed={role === item.key} onClick={() => setRole(item.key)} className={cn("rounded-md px-3 py-1.5 text-sm font-semibold", role === item.key ? "bg-mod-primary text-white" : "text-mod-text-secondary hover:bg-mod-canvas-accent")}>{item.label}</button>
        ))}
      </div>
      <ol id="recording-sheet" className="space-y-2">
        {dialogue.turns.map((turn, index) => {
          const dimmed = role !== "ALL" && role !== turn.speaker;
          return (
            <li key={turn.id} data-dimmed={dimmed} className={cn("rounded-xl border border-mod-border bg-mod-surface p-4", dimmed && "opacity-35")}>
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-mod-text">
                <span className="text-xs font-medium text-mod-text-secondary">{index + 1}</span>
                <span className={cn("size-2.5 rounded-sm", speakerDot[turn.speaker])} aria-hidden="true" />
                {nameOf(turn.speaker)}
                {turn.style ? <span className="rounded-full bg-mod-canvas-accent px-2 py-0.5 text-xs font-medium text-mod-text-secondary">{turn.style}</span> : null}
              </p>
              <p className="mt-1 text-base leading-8 text-mod-text">
                {dialogueSegments(turn.text).map((segment, at) =>
                  segment.kind === "cue" ? <span key={at} className="mx-0.5 rounded bg-mod-primary/10 px-1.5 text-xs font-semibold text-mod-primary">{segment.value}</span>
                  : segment.kind === "reply" ? <span key={at} title="Người kia chen vào" className="mx-0.5 border-b border-dotted border-mod-text-secondary text-sm text-mod-text-secondary">[{segment.value}]</span>
                  : <span key={at}>{segment.value}</span>)}
              </p>
              {turn.note ? <p className="mt-2 inline-block rounded-md bg-mod-attention/10 px-2 py-1 text-xs text-mod-attention">{turn.note}</p> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
