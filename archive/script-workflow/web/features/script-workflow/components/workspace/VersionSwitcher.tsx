import { ArrowUUpLeft, ChatCenteredText, Info } from "@phosphor-icons/react";
import type { StepVersion, WorkflowStep } from "@repo/shared";
import { cn } from "@/lib/utils";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { formatDateTime } from "../../labels";
import { versionsAscending } from "./workspaceModel";

type VersionSwitcherProps = {
  step: WorkflowStep;
  viewedVersion: StepVersion;
  onChoose: (version: number) => void;
};

function versionLabel(step: WorkflowStep, version: number): string {
  const parts = [`v${version}`];
  if (version === step.currentVersion) parts.push("hiện tại");
  if (version === step.approvedVersion) parts.push("đã duyệt");
  return parts.join(" · ");
}

/** `v1, v2…` tabs, the note the moderator left on the viewed version, and the "viewing an old version" strip. */
export function VersionSwitcher({ step, viewedVersion, onChoose }: VersionSwitcherProps) {
  const versions = versionsAscending(step);
  const current = step.currentVersion;
  const viewingOld = current !== null && viewedVersion.version !== current;

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Phiên bản của bước" className="flex flex-wrap items-center gap-2">
        {versions.map((entry) => {
          const selected = entry.version === viewedVersion.version;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChoose(entry.version)}
              className={cn(
                "min-h-11 rounded-[10px] border px-3 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary",
                selected
                  ? "border-mod-primary bg-mod-primary text-white"
                  : "border-mod-border bg-mod-surface text-mod-text-muted hover:bg-mod-canvas-accent",
              )}
            >
              <ModeratorText>{versionLabel(step, entry.version)}</ModeratorText>
            </button>
          );
        })}
        <ModeratorText className="text-xs text-mod-text-secondary">
          Tạo lúc {formatDateTime(viewedVersion.createdAt)}
        </ModeratorText>
      </div>

      {viewedVersion.humanFeedback ? (
        <div className="flex items-start gap-2 rounded-[10px] border border-mod-border bg-mod-canvas px-3 py-2.5">
          <ChatCenteredText size={18} className="mt-0.5 shrink-0 text-mod-text-secondary" aria-hidden={true} />
          <ModeratorText className="text-sm text-mod-text-muted">
            <span className="font-bold text-mod-text">Ghi chú của bạn: </span>
            {viewedVersion.humanFeedback}
          </ModeratorText>
        </div>
      ) : null}

      {viewingOld ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-[10px] border border-mod-primary/40 bg-mod-primary/10 px-3 py-2.5"
        >
          <Info size={18} weight="fill" className="shrink-0 text-mod-primary-hover" aria-hidden={true} />
          <ModeratorText className="min-w-0 flex-1 text-sm font-semibold text-mod-text">
            Bạn đang xem v{viewedVersion.version}. Hành động áp dụng cho v{current}.
          </ModeratorText>
          <button
            type="button"
            onClick={() => onChoose(current ?? viewedVersion.version)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-primary bg-mod-surface px-3 text-sm font-bold text-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary"
          >
            <ArrowUUpLeft size={16} aria-hidden={true} />
            Về phiên bản hiện tại
          </button>
        </div>
      ) : null}
    </div>
  );
}
