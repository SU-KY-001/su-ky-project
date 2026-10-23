import { useId, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Clock, TextAa, User } from "@phosphor-icons/react";
import type { GetWorkflowResponse, ImportResult, ScriptPublication, StepVersion } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { workflowDetailPath } from "../../constants";
import { formatDateTime, formatDuration, formatWords } from "../../labels";
import { StatusBadge } from "../workspace/StatusBadge";
import { Chip } from "../workspace/steps/stepUi";
import { CopyButton } from "./CopyButton";
import { ImportResultBanner } from "./ImportResultBanner";
import { PublicationEpisodesSection } from "./PublicationEpisodesSection";
import { PublicationSourcesSection } from "./PublicationSourcesSection";
import { StudioImportButton } from "./StudioImportControl";

const CHIP_ICON_SIZE = 13;
const BACK_ICON_SIZE = 16;

function findApprovedFactCheckerVersion(
  workflow: GetWorkflowResponse,
  approvedVersionId: number,
): StepVersion | null {
  for (const step of workflow.steps) {
    const found = step.versions.find((version) => version.id === approvedVersionId);
    if (found) return found;
  }
  return null;
}

type PublicationViewProps = {
  workflow: GetWorkflowResponse;
  publications: readonly ScriptPublication[];
  importedResult: ImportResult | null | undefined;
};

export function PublicationView({ workflow, publications, importedResult }: PublicationViewProps) {
  const selectId = useId();
  const [selectedPubId, setSelectedPubId] = useState<number>(() => publications[0]?.id ?? 0);

  const currentPublication =
    publications.find((item) => item.id === selectedPubId) ?? publications[0];

  if (!currentPublication) return null;

  const factCheckerVersion = findApprovedFactCheckerVersion(
    workflow,
    currentPublication.approvedVersionId,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={workflowDetailPath(workflow.id)}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-mod-border bg-mod-surface px-3.5 text-sm font-bold text-mod-text no-underline transition-colors hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"
        >
          <ArrowLeft size={BACK_ICON_SIZE} aria-hidden={true} />
          <ModeratorText>Quay lại trang duyệt kịch bản</ModeratorText>
        </Link>

        {publications.length > 1 ? (
          <div className="flex items-center gap-2">
            <label htmlFor={selectId} className="text-xs font-bold text-mod-text-muted">
              <ModeratorText>Bản xuất bản:</ModeratorText>
            </label>
            <select
              id={selectId}
              value={currentPublication.id}
              onChange={(event) => setSelectedPubId(Number(event.target.value))}
              className="min-h-11 rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-sm font-semibold text-mod-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
            >
              {publications.map((pub, index) => (
                <option key={pub.id} value={pub.id}>
                  Bản #{pub.id} · {formatDateTime(pub.publishedAt)}
                  {index === 0 ? " (mới nhất)" : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <section className="flex flex-col gap-4 rounded-[16px] border border-mod-border bg-mod-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <ModeratorText as="h1" className="text-xl font-extrabold tracking-tight text-mod-text">
              {workflow.topic}
            </ModeratorText>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="COMPLETED" label="Đã xuất bản" tone="success" />
              <Chip icon={<TextAa size={CHIP_ICON_SIZE} aria-hidden={true} />}>
                {formatWords(currentPublication.totalWords)}
              </Chip>
              <Chip icon={<Clock size={CHIP_ICON_SIZE} aria-hidden={true} />}>
                {formatDuration(currentPublication.estimatedDurationSeconds)}
              </Chip>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-mod-text-secondary">
              <span className="inline-flex items-center gap-1">
                <User size={CHIP_ICON_SIZE} aria-hidden={true} />
                <ModeratorText>Duyệt bởi: {currentPublication.approvedById}</ModeratorText>
              </span>
              <span aria-hidden={true}>·</span>
              <ModeratorText>{formatDateTime(currentPublication.publishedAt)}</ModeratorText>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <CopyButton label="Copy toàn bộ" text={currentPublication.finalScript} />
            <StudioImportButton workflowId={workflow.id} importedResult={importedResult} />
          </div>
        </div>

        {importedResult ? <ImportResultBanner result={importedResult} /> : null}
      </section>

      <section className="flex flex-col gap-6 rounded-[16px] border border-mod-border bg-mod-surface p-5">
        <PublicationEpisodesSection
          workflow={workflow}
          factCheckerVersion={factCheckerVersion}
          finalScript={currentPublication.finalScript}
        />

        <hr className="border-mod-border" />

        <PublicationSourcesSection
          workflow={workflow}
          factCheckerVersion={factCheckerVersion}
        />
      </section>
    </div>
  );
}
