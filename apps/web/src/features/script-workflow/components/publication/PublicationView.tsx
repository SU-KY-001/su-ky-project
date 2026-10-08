import { useId, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Clock, TextAa, User } from "@phosphor-icons/react";
import {
  SOURCE_TIER_LABELS,
  STEP_OUTPUT_SCHEMAS,
  type EvaluatedSource,
  type GetWorkflowResponse,
  type ImportResult,
  type ScriptPublication,
  type StepVersion,
} from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { workflowDetailPath } from "../../constants";
import { formatDateTime, formatDuration, formatWords } from "../../labels";
import { StatusBadge } from "../workspace/StatusBadge";
import { TabList, TabPanel, type TabDefinition } from "../workspace/Tabs";
import { findAncestorVersion } from "../workspace/workspaceModel";
import { ReliabilityScore } from "../workspace/steps/ReliabilityScore";
import { Chip, EmptyNote, ExternalLink, Section, UnreadableStepData } from "../workspace/steps/stepUi";
import { CopyButton } from "./CopyButton";
import { ImportResultBanner, StudioImportButton } from "./StudioImportControl";

const EPISODE_TAB_PREFIX = "publication-episode";
const SPOKEN_TEXT_CLASS = "max-w-[70ch] whitespace-pre-line text-lg leading-8 text-mod-text";
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

function ReferenceSourceItem({ source }: { source: EvaluatedSource }) {
  return (
    <li className="flex flex-col gap-2 rounded-[12px] border border-mod-border bg-mod-canvas p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <ModeratorText as="h4" className="min-w-0 text-sm font-extrabold text-mod-text">
          {source.name}
        </ModeratorText>
        <ReliabilityScore score={source.reliabilityScore} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="info">{SOURCE_TIER_LABELS[source.tier]}</Chip>
      </div>
      {source.url ? (
        <ModeratorText as="p" className="text-xs">
          <ExternalLink url={source.url}>{source.url}</ExternalLink>
        </ModeratorText>
      ) : null}
    </li>
  );
}

function PublicationEpisodesSection({
  workflow,
  factCheckerVersion,
  finalScript,
}: {
  workflow: GetWorkflowResponse;
  factCheckerVersion: StepVersion | null;
  finalScript: string;
}) {
  const [selectedEpisode, setSelectedEpisode] = useState<string>("1");
  const oralizerVersion = factCheckerVersion
    ? findAncestorVersion(workflow, factCheckerVersion, "ORALIZER")
    : null;
  const parsed = oralizerVersion
    ? STEP_OUTPUT_SCHEMAS.ORALIZER.safeParse(oralizerVersion.outputJson)
    : null;

  if (!parsed || !parsed.success) {
    return (
      <div className="flex flex-col gap-4">
        <UnreadableStepData output={oralizerVersion?.outputJson ?? null} />
        <Section title="Bản văn nói hợp nhất">
          <ModeratorText as="p" className={SPOKEN_TEXT_CLASS}>
            {finalScript}
          </ModeratorText>
        </Section>
      </div>
    );
  }

  const { seriesTitle, episodes } = parsed.data;
  const tabs: readonly TabDefinition<string>[] = episodes.map((episode) => ({
    id: String(episode.episodeNumber),
    label: `Tập ${episode.episodeNumber}`,
  }));

  return (
    <div className="flex flex-col gap-4">
      <ModeratorText as="h2" className="text-lg font-extrabold text-mod-text">
        {seriesTitle}
      </ModeratorText>

      <div>
        <TabList
          label="Các tập đã xuất bản"
          idPrefix={EPISODE_TAB_PREFIX}
          tabs={tabs}
          value={selectedEpisode}
          onChange={setSelectedEpisode}
        />
        {episodes.map((episode) => (
          <TabPanel
            key={episode.episodeNumber}
            idPrefix={EPISODE_TAB_PREFIX}
            id={String(episode.episodeNumber)}
            value={selectedEpisode}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <ModeratorText as="h3" className="text-base font-extrabold text-mod-text">
                  Tập {episode.episodeNumber}: {episode.episodeTitle}
                </ModeratorText>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip icon={<TextAa size={CHIP_ICON_SIZE} aria-hidden={true} />}>
                    {formatWords(episode.wordCount)}
                  </Chip>
                  <Chip icon={<Clock size={CHIP_ICON_SIZE} aria-hidden={true} />}>
                    {formatDuration(episode.estimatedDurationSeconds)}
                  </Chip>
                </div>
              </div>
              <CopyButton
                label="Copy tập này"
                text={episode.spokenNarration}
                variant="primary"
              />
            </div>

            <div className="rounded-[12px] border border-mod-border bg-mod-canvas p-5">
              <ModeratorText as="p" className={SPOKEN_TEXT_CLASS}>
                {episode.spokenNarration}
              </ModeratorText>
            </div>

            {episode.breathAndPacingNotes ? (
              <Section title="Ghi chú nhịp đọc" className="max-w-[70ch]">
                <ModeratorText
                  as="p"
                  className="whitespace-pre-line rounded-[10px] bg-mod-canvas px-3.5 py-3 text-sm text-mod-text-muted"
                >
                  {episode.breathAndPacingNotes}
                </ModeratorText>
              </Section>
            ) : null}
          </TabPanel>
        ))}
      </div>
    </div>
  );
}

function PublicationSourcesSection({
  workflow,
  factCheckerVersion,
}: {
  workflow: GetWorkflowResponse;
  factCheckerVersion: StepVersion | null;
}) {
  const sourceEvaluatorVersion = factCheckerVersion
    ? findAncestorVersion(workflow, factCheckerVersion, "SOURCE_EVALUATOR")
    : null;
  const parsed = sourceEvaluatorVersion
    ? STEP_OUTPUT_SCHEMAS.SOURCE_EVALUATOR.safeParse(sourceEvaluatorVersion.outputJson)
    : null;

  if (!parsed || !parsed.success) {
    return (
      <Section title="Nguồn tham khảo">
        <UnreadableStepData output={sourceEvaluatorVersion?.outputJson ?? null} />
      </Section>
    );
  }

  const sources = parsed.data.evaluatedSources;

  return (
    <Section title={`Nguồn tham khảo (${sources.length})`}>
      {sources.length === 0 ? (
        <EmptyNote>Chưa có nguồn tham khảo được ghi nhận.</EmptyNote>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {sources.map((source) => (
            <ReferenceSourceItem key={source.id} source={source} />
          ))}
        </ul>
      )}
    </Section>
  );
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
