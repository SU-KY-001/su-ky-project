import { useState, type ReactNode } from "react";
import { Clock, TextAa } from "@phosphor-icons/react";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { formatDuration, formatWords } from "../../../labels";
import { TabList, TabPanel, type TabDefinition } from "../Tabs";
import { Chip } from "./stepUi";

export type EpisodeText = {
  episodeNumber: number;
  episodeTitle: string;
  text: string;
  wordCount: number;
  estimatedDurationSeconds: number;
  /** Extra block shown under the text (pacing notes). */
  extra?: ReactNode;
};

type EpisodeScriptTabsProps = {
  idPrefix: string;
  seriesTitle: string;
  totalWordCount: number;
  episodes: readonly EpisodeText[];
  /** Tailwind classes for the long text; the oralizer uses a narrow reading column. */
  textClassName: string;
  banner?: ReactNode;
};

/** Series header with total words, 3 episode tabs, and the episode text with its word count and duration. */
export function EpisodeScriptTabs({ idPrefix, seriesTitle, totalWordCount, episodes, textClassName, banner }: EpisodeScriptTabsProps) {
  const [selected, setSelected] = useState<string>("1");
  const tabs: readonly TabDefinition<string>[] = episodes.map((episode) => ({
    id: String(episode.episodeNumber),
    label: `Tập ${episode.episodeNumber}`,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <ModeratorText as="h2" className="text-lg font-extrabold text-mod-text">{seriesTitle}</ModeratorText>
        <div className="flex flex-wrap items-center gap-2">
          <Chip icon={<TextAa size={13} aria-hidden={true} />}>Tổng {formatWords(totalWordCount)}</Chip>
          {banner}
        </div>
      </div>
      <div>
        <TabList label="Các tập" idPrefix={idPrefix} tabs={tabs} value={selected} onChange={setSelected} />
        {episodes.map((episode) => (
          <TabPanel key={episode.episodeNumber} idPrefix={idPrefix} id={String(episode.episodeNumber)} value={selected} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <ModeratorText as="h3" className="text-base font-extrabold text-mod-text">{episode.episodeTitle}</ModeratorText>
              <div className="flex flex-wrap gap-2">
                <Chip icon={<TextAa size={13} aria-hidden={true} />}>{formatWords(episode.wordCount)}</Chip>
                <Chip icon={<Clock size={13} aria-hidden={true} />}>{formatDuration(episode.estimatedDurationSeconds)}</Chip>
              </div>
            </div>
            <ModeratorText as="p" className={textClassName}>{episode.text}</ModeratorText>
            {episode.extra}
          </TabPanel>
        ))}
      </div>
    </div>
  );
}
