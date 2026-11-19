import { useState, type ReactElement } from "react";
import type { Dialogue } from "@repo/shared";
import { cn } from "@/lib/utils";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { dialogueSegments } from "../dialogueState";
import { speakerColorClass } from "../speakerColor";

type RoleFilter = string;
const ALL_ROLES = "ALL";
const UNASSIGNED_LABEL = "Chưa gán";

/**
 * Read-along sheet for the people recording outside the system: each turn with its tone, stage directions and note.
 * Choosing a role highlights it while keeping the other speakers' turns for context.
 */
export function DialogueRecordingSheet({ dialogue }: { dialogue: Dialogue }): ReactElement {
  const [role, setRole] = useState<RoleFilter>(ALL_ROLES);
  const roles: { key: RoleFilter; label: string }[] = [{ key: ALL_ROLES, label: "Tất cả" }, ...dialogue.speakers.map((speaker) => ({ key: speaker.key, label: speaker.name }))];
  const nameOf = (key: string): string => dialogue.speakers.find((speaker) => speaker.key === key)?.name ?? UNASSIGNED_LABEL;

  return (
    <section aria-labelledby="recording-sheet-title" className="overflow-hidden rounded-xl border border-mod-border bg-mod-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-mod-border px-4 py-3 sm:px-5">
        <div><h3 id="recording-sheet-title" className="font-semibold text-mod-text">Xem trước kịch bản</h3><p className="mt-1 text-xs text-mod-text-secondary">{dialogue.turns.length} lượt thoại · {dialogue.speakers.length} người nói</p></div>
        <div className="w-full sm:w-56"><ModeratorSelect label="Làm nổi bật người nói" value={role} onValueChange={setRole} options={roles.map((item) => ({ value: item.key, label: item.label }))} placeholder="Tất cả người nói" /></div>
      </header>
      <ol id="recording-sheet" className="max-h-[60dvh] divide-y divide-mod-border overflow-y-auto overscroll-contain">
        {dialogue.turns.map((turn, index) => {
          const dimmed = role !== ALL_ROLES && role !== turn.speaker;
          return (
            <li key={turn.id} data-dimmed={dimmed} className={cn("grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 gap-y-1 px-4 py-4 sm:grid-cols-[28px_140px_minmax(0,1fr)] sm:px-5", dimmed && "opacity-50", role !== ALL_ROLES && !dimmed && "bg-mod-primary/5")}>
              <span className="pt-0.5 text-xs tabular-nums text-mod-text-secondary">{String(index + 1).padStart(2, "0")}</span>
              <p className="flex flex-wrap items-center gap-2 self-start text-sm font-semibold text-mod-text">
                <span className={cn("size-2.5 rounded-sm", speakerColorClass(dialogue, turn.speaker))} aria-hidden="true" />
                {nameOf(turn.speaker)}
                {turn.style ? <span className="rounded-full bg-mod-canvas-accent px-2 py-0.5 text-xs font-medium text-mod-text-secondary">{turn.style}</span> : null}
              </p>
              <div className="col-start-2 min-w-0 sm:col-start-3 sm:row-span-2"><p className="whitespace-pre-wrap text-sm leading-7 text-mod-text">
                {dialogueSegments(turn.text).map((segment, at) =>
                  segment.kind === "cue" ? <span key={at} className="mx-0.5 rounded bg-mod-primary/10 px-1.5 text-xs font-semibold text-mod-primary">{segment.value}</span>
                  : segment.kind === "reply" ? <span key={at} title="Người kia chen vào" className="mx-0.5 border-b border-dotted border-mod-text-secondary text-sm text-mod-text-secondary">[{segment.value}]</span>
                  : <span key={at}>{segment.value}</span>)}
              </p>
              {turn.note ? <p className="mt-2 text-xs text-mod-text-secondary">{turn.note}</p> : null}</div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
