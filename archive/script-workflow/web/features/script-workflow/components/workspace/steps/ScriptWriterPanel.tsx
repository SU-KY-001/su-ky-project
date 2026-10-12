import { Note } from "@phosphor-icons/react";
import { STEP_OUTPUT_SCHEMAS } from "@repo/shared";
import { EpisodeScriptTabs } from "./EpisodeScriptTabs";
import { Chip, ParsedOutput } from "./stepUi";

const TAB_ID_PREFIX = "script-writer";
const TEXT_CLASS = "whitespace-pre-line text-base leading-7 text-mod-text";

/** Automatic step, read-only: the intermediate draft written before the spoken-style pass. */
export function ScriptWriterPanel({ output }: { output: unknown }) {
  return (
    <ParsedOutput schema={STEP_OUTPUT_SCHEMAS.SCRIPT_WRITER} output={output}>
      {(data) => (
        <EpisodeScriptTabs
          idPrefix={TAB_ID_PREFIX}
          seriesTitle={data.seriesTitle}
          totalWordCount={data.totalWordCount}
          textClassName={TEXT_CLASS}
          banner={<Chip tone="info" icon={<Note size={13} aria-hidden={true} />}>Bản nháp trước khi chuyển văn nói</Chip>}
          episodes={data.episodes.map((episode) => ({
            episodeNumber: episode.episodeNumber,
            episodeTitle: episode.episodeTitle,
            text: episode.narration,
            wordCount: episode.wordCount,
            estimatedDurationSeconds: episode.estimatedDurationSeconds,
          }))}
        />
      )}
    </ParsedOutput>
  );
}
