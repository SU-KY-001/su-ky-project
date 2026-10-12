import { useState } from "react";
import { STEP_OUTPUT_SCHEMAS, type StoryEpisodeOutline, type WorkflowStep } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { StoryPlannerEditor } from "../gates/StoryPlannerEditor";
import { TabList, TabPanel, type TabDefinition } from "../Tabs";
import { BulletList, Chip, EmptyNote, ParsedOutput, Section } from "./stepUi";

const TAB_ID_PREFIX = "story-planner";

const SPDC_CELLS: readonly { key: keyof StoryEpisodeOutline["spdcCycle"]; label: string }[] = [
  { key: "situation", label: "Bối cảnh" },
  { key: "problem", label: "Vấn đề" },
  { key: "decision", label: "Quyết định" },
  { key: "consequence", label: "Hệ quả" },
];

function EpisodeOutline({ episode }: { episode: StoryEpisodeOutline }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <ModeratorText as="h3" className="text-lg font-extrabold text-mod-text">
          {episode.episodeTitle}
        </ModeratorText>
        <ModeratorText as="p" className="text-sm text-mod-text-muted">
          <span className="font-bold">Câu hỏi trung tâm: </span>
          {episode.centralQuestion}
        </ModeratorText>
      </div>

      <Section title="Chu kỳ Bối cảnh, Vấn đề, Quyết định, Hệ quả">
        <dl className="grid gap-3 sm:grid-cols-2">
          {SPDC_CELLS.map((cell) => (
            <div key={cell.key} className="flex flex-col gap-1 rounded-[12px] border border-mod-border bg-mod-surface p-3.5">
              <dt className="font-moderator text-xs font-extrabold uppercase tracking-wide text-mod-text-secondary">
                {cell.label}
              </dt>
              <dd className="font-moderator text-sm text-mod-text">{episode.spdcCycle[cell.key]}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Nhịp kể">
        {episode.narrativeBeats.length === 0 ? (
          <EmptyNote>Chưa có nhịp kể.</EmptyNote>
        ) : (
          <BulletList items={episode.narrativeBeats} />
        )}
      </Section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Kể lướt">
          {episode.pacingPlan.summaryMoments.length === 0 ? (
            <EmptyNote>Không có.</EmptyNote>
          ) : (
            <BulletList items={episode.pacingPlan.summaryMoments} />
          )}
        </Section>
        <Section title="Kể chi tiết">
          {episode.pacingPlan.detailedSceneMoments.length === 0 ? (
            <EmptyNote>Không có.</EmptyNote>
          ) : (
            <BulletList items={episode.pacingPlan.detailedSceneMoments} />
          )}
        </Section>
      </div>

      <Section title="Câu móc cuối tập">
        <ModeratorText as="p" className="rounded-[10px] bg-mod-canvas px-3.5 py-3 text-sm font-semibold italic text-mod-text">
          {episode.hookEnd}
        </ModeratorText>
      </Section>
    </div>
  );
}

function StoryPlannerContent({
  episodes,
  seriesTitle,
  narrativeFocus,
}: {
  episodes: readonly StoryEpisodeOutline[];
  seriesTitle: string;
  narrativeFocus: string;
}) {
  const [selected, setSelected] = useState<string>("1");
  const tabs: readonly TabDefinition<string>[] = episodes.map((episode) => ({
    id: String(episode.episodeNumber),
    label: `Tập ${episode.episodeNumber}`,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <ModeratorText as="h2" className="text-lg font-extrabold text-mod-text">
            {seriesTitle}
          </ModeratorText>
          <Chip tone="info">3 tập</Chip>
        </div>
        <ModeratorText as="p" className="text-sm text-mod-text-secondary">
          Trọng tâm kể: {narrativeFocus}
        </ModeratorText>
      </div>
      <div>
        <TabList label="Các tập" idPrefix={TAB_ID_PREFIX} tabs={tabs} value={selected} onChange={setSelected} />
        {episodes.map((episode) => (
          <TabPanel
            key={episode.episodeNumber}
            idPrefix={TAB_ID_PREFIX}
            id={String(episode.episodeNumber)}
            value={selected}
          >
            <EpisodeOutline episode={episode} />
          </TabPanel>
        ))}
      </div>
    </div>
  );
}

type StoryPlannerPanelProps = {
  output: unknown;
  workflowId?: number;
  step?: WorkflowStep;
  editing?: boolean;
  onExitEdit?: () => void;
  onConflict?: () => void;
};

/** Gate 1 view of the 3-episode outline, switching to the field editor when manual edit mode is active. */
export function StoryPlannerPanel({
  output,
  workflowId,
  step,
  editing = false,
  onExitEdit,
  onConflict,
}: StoryPlannerPanelProps) {
  return (
    <ParsedOutput schema={STEP_OUTPUT_SCHEMAS.STORY_PLANNER} output={output}>
      {(data) => {
        if (editing && workflowId !== undefined && step !== undefined && onExitEdit && onConflict) {
          return (
            <StoryPlannerEditor
              workflowId={workflowId}
              step={step}
              initialData={data}
              onSaved={onExitEdit}
              onCancel={onExitEdit}
              onConflict={onConflict}
            />
          );
        }
        return (
          <StoryPlannerContent
            episodes={data.episodes}
            seriesTitle={data.seriesTitle}
            narrativeFocus={data.narrativeFocus}
          />
        );
      }}
    </ParsedOutput>
  );
}
