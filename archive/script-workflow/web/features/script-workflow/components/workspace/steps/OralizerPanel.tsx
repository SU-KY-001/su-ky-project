import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { STEP_OUTPUT_SCHEMAS } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { useWorkflowEvents } from "../../../hooks/useWorkflowReads";
import { useWorkflowUiStore } from "../../../store";
import { findOralizerLintStatus } from "../events/eventLabels";
import { EpisodeScriptTabs } from "./EpisodeScriptTabs";
import { Chip, ParsedOutput, Section } from "./stepUi";

const TAB_ID_PREFIX = "oralizer";
const TEXT_CLASS = "whitespace-pre-line text-lg leading-8 text-mod-text";

/** Automatic step, read-only: the spoken narration for each episode and the breathing notes. */
export function OralizerPanel({ output }: { output: unknown }) {
  const workflowId = useWorkflowUiStore((state) => state.workflowId);
  const eventsQuery = useWorkflowEvents(workflowId ?? 0, workflowId !== null);
  const lintStatus = eventsQuery.data ? findOralizerLintStatus(eventsQuery.data.events) : null;

  return (
    <ParsedOutput schema={STEP_OUTPUT_SCHEMAS.ORALIZER} output={output}>
      {(data) => (
        <div className="flex flex-col gap-3">
          {lintStatus === "passed" ? (
            <div>
              <Chip tone="success" icon={<CheckCircle size={14} weight="fill" aria-hidden={true} />}>
                Kiểm tra dấu câu văn nói: Đạt
              </Chip>
            </div>
          ) : lintStatus === "failed" ? (
            <div>
              <Chip tone="attention" icon={<WarningCircle size={14} weight="fill" aria-hidden={true} />}>
                Kiểm tra dấu câu văn nói: Đã tự chỉnh lại
              </Chip>
            </div>
          ) : null}
          <EpisodeScriptTabs
            idPrefix={TAB_ID_PREFIX}
            seriesTitle={data.seriesTitle}
            totalWordCount={data.totalWordCount}
          textClassName={TEXT_CLASS}
          episodes={data.episodes.map((episode) => ({
            episodeNumber: episode.episodeNumber,
            episodeTitle: episode.episodeTitle,
            text: episode.spokenNarration,
            wordCount: episode.wordCount,
            estimatedDurationSeconds: episode.estimatedDurationSeconds,
            extra: episode.breathAndPacingNotes ? (
              <Section title="Ghi chú ngắt hơi và nhịp đọc">
                <ModeratorText as="p" className="whitespace-pre-line rounded-[10px] bg-mod-canvas px-3.5 py-3 text-sm text-mod-text-muted">
                  {episode.breathAndPacingNotes}
                </ModeratorText>
              </Section>
            ) : null,
          }))}
          />
        </div>
      )}
    </ParsedOutput>
  );
}
