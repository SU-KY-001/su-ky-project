import { useState } from "react";
import { Clock, TextAa } from "@phosphor-icons/react";
import { STEP_OUTPUT_SCHEMAS, type GetWorkflowResponse, type StepVersion } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { formatDuration, formatWords } from "../../labels";
import { TabList, TabPanel, type TabDefinition } from "../workspace/Tabs";
import { findAncestorVersion } from "../workspace/workspaceModel";
import { Chip, Section, UnreadableStepData } from "../workspace/steps/stepUi";
import { CopyButton } from "./CopyButton";

const EPISODE_TAB_PREFIX = "publication-episode";
const SPOKEN_TEXT_CLASS = "whitespace-pre-line text-lg leading-8 text-mod-text";
const CHIP_ICON_SIZE = 13;

export function PublicationEpisodesSection({
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
              <Section title="Ghi chú nhịp đọc">
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
