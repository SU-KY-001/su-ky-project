import type { StoryEpisodeOutline } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { Section } from "../steps/stepUi";
import { StringListEditor } from "./StringListEditor";
import { INPUT_CLASS, SPDC_FIELDS, TEXTAREA_CLASS } from "./storyOutlineForm";

const SPDC_ROWS = 3;
const HOOK_ROWS = 2;

type StoryEpisodeEditorProps = {
  episode: StoryEpisodeOutline;
  disabled: boolean;
  onUpdate: (updater: (prev: StoryEpisodeOutline) => StoryEpisodeOutline) => void;
};

export function StoryEpisodeEditor({ episode, disabled, onUpdate }: StoryEpisodeEditorProps) {
  return (
    <div className="flex flex-col gap-5 rounded-[12px] border border-mod-border bg-mod-surface p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <ModeratorText className="text-sm font-bold text-mod-text">
            Tiêu đề tập {episode.episodeNumber}
          </ModeratorText>
          <input
            type="text"
            disabled={disabled}
            value={episode.episodeTitle}
            onChange={(event) =>
              onUpdate((prev) => ({
                ...prev,
                episodeNumber: episode.episodeNumber,
                episodeTitle: event.target.value,
              }))
            }
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <ModeratorText className="text-sm font-bold text-mod-text">Câu hỏi trung tâm</ModeratorText>
          <input
            type="text"
            disabled={disabled}
            value={episode.centralQuestion}
            onChange={(event) =>
              onUpdate((prev) => ({
                ...prev,
                centralQuestion: event.target.value,
              }))
            }
            className={INPUT_CLASS}
          />
        </label>
      </div>

      <Section title="Chu kỳ Bối cảnh, Vấn đề, Quyết định, Hệ quả">
        <div className="grid gap-3 sm:grid-cols-2">
          {SPDC_FIELDS.map((cell) => (
            <label key={cell.key} className="flex flex-col gap-1.5">
              <ModeratorText className="text-xs font-extrabold uppercase tracking-wide text-mod-text-secondary">
                {cell.label}
              </ModeratorText>
              <textarea
                rows={SPDC_ROWS}
                disabled={disabled}
                value={episode.spdcCycle[cell.key]}
                onChange={(event) =>
                  onUpdate((prev) => ({
                    ...prev,
                    spdcCycle: {
                      ...prev.spdcCycle,
                      [cell.key]: event.target.value,
                    },
                  }))
                }
                className={TEXTAREA_CLASS}
              />
            </label>
          ))}
        </div>
      </Section>

      <StringListEditor
        title="Nhịp kể"
        items={episode.narrativeBeats}
        disabled={disabled}
        onChange={(next) =>
          onUpdate((prev) => ({
            ...prev,
            narrativeBeats: next,
          }))
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <StringListEditor
          title="Kể lướt"
          items={episode.pacingPlan.summaryMoments}
          disabled={disabled}
          onChange={(next) =>
            onUpdate((prev) => ({
              ...prev,
              pacingPlan: {
                ...prev.pacingPlan,
                summaryMoments: next,
              },
            }))
          }
        />
        <StringListEditor
          title="Kể chi tiết"
          items={episode.pacingPlan.detailedSceneMoments}
          disabled={disabled}
          onChange={(next) =>
            onUpdate((prev) => ({
              ...prev,
              pacingPlan: {
                ...prev.pacingPlan,
                detailedSceneMoments: next,
              },
            }))
          }
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <ModeratorText className="text-sm font-bold text-mod-text">Câu móc cuối tập</ModeratorText>
        <textarea
          rows={HOOK_ROWS}
          disabled={disabled}
          value={episode.hookEnd}
          onChange={(event) =>
            onUpdate((prev) => ({
              ...prev,
              hookEnd: event.target.value,
            }))
          }
          className={TEXTAREA_CLASS}
        />
      </label>
    </div>
  );
}
