import { useId, useState } from "react";
import { CircleNotch, FloppyDisk } from "@phosphor-icons/react";
import type { StoryEpisodeOutline, StoryOutline, WorkflowStep } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { RateLimitNotice } from "../../create/Notices";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";
import { TabList, TabPanel, type TabDefinition } from "../Tabs";
import { Callout, Chip } from "../steps/stepUi";
import { useGate1EditDraft } from "./gateDrafts";
import { StoryEpisodeEditor } from "./StoryEpisodeEditor";
import { INPUT_CLASS } from "./storyOutlineForm";
import { useStoryPlannerSave } from "./useStoryPlannerSave";

const TAB_ID_PREFIX = "story-planner-edit";
const ICON_SIZE_MD = 18;

type StoryPlannerEditorProps = {
  workflowId: number;
  step: WorkflowStep;
  initialData: StoryOutline;
  onSaved: () => void;
  onCancel: () => void;
  onConflict: () => void;
};

export function StoryPlannerEditor({
  workflowId,
  step,
  initialData,
  onSaved,
  onCancel,
  onConflict,
}: StoryPlannerEditorProps) {
  const seriesTitleId = useId();
  const focusId = useId();
  const noteId = useId();
  const { outline, note, isDirty, update, clear } = useGate1EditDraft(workflowId, initialData);
  const { isPending, validationErrors, setValidationErrors, serverError, rateLimit, clearRateLimit, handleSave } =
    useStoryPlannerSave({ workflowId, step, outline, note, clearDraft: clear, onSaved, onConflict });

  const [selectedEp, setSelectedEp] = useState<string>("1");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const tabs: readonly TabDefinition<string>[] = outline.episodes.map((episode) => ({
    id: String(episode.episodeNumber),
    label: `Tập ${episode.episodeNumber}`,
  }));

  const updateEpisode = (episodeIndex: 0 | 1 | 2, updater: (prev: StoryEpisodeOutline) => StoryEpisodeOutline) => {
    const nextEpisodes: [StoryEpisodeOutline, StoryEpisodeOutline, StoryEpisodeOutline] = [
      episodeIndex === 0 ? updater(outline.episodes[0]) : outline.episodes[0],
      episodeIndex === 1 ? updater(outline.episodes[1]) : outline.episodes[1],
      episodeIndex === 2 ? updater(outline.episodes[2]) : outline.episodes[2],
    ];
    update({
      ...outline,
      scale: "3_EPISODES",
      episodes: nextEpisodes,
    });
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setConfirmCancel(true);
      return;
    }
    clear();
    onCancel();
  };

  return (
    <div className="flex flex-col gap-5 rounded-[14px] border border-mod-border bg-mod-canvas p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ModeratorText as="h3" className="text-base font-extrabold text-mod-text">
          Chỉnh sửa dàn ý 3 tập
        </ModeratorText>
        <Chip tone="info">3 tập · Quy mô cố định</Chip>
      </div>

      {validationErrors.length > 0 ? (
        <Callout tone="danger" title="Vui lòng kiểm tra lại thông tin" role="alert">
          <ul className="list-disc pl-5">
            {validationErrors.map((err, idx) => (
              <li key={`${idx}-${err}`}>{err}</li>
            ))}
          </ul>
        </Callout>
      ) : null}

      {serverError ? (
        <Callout tone="danger" title="Không thể lưu chỉnh sửa" role="alert">
          {serverError}
        </Callout>
      ) : null}

      {rateLimit ? (
        <RateLimitNotice key={rateLimit.startedAt} seconds={rateLimit.seconds} onElapsed={clearRateLimit} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={seriesTitleId} className="font-moderator text-sm font-bold text-mod-text">
            Tiêu đề series
          </label>
          <input
            id={seriesTitleId}
            type="text"
            disabled={isPending}
            value={outline.seriesTitle}
            onChange={(event) => update({ ...outline, seriesTitle: event.target.value })}
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={focusId} className="font-moderator text-sm font-bold text-mod-text">
            Trọng tâm kể
          </label>
          <input
            id={focusId}
            type="text"
            disabled={isPending}
            value={outline.narrativeFocus}
            onChange={(event) => update({ ...outline, narrativeFocus: event.target.value })}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <TabList label="Chọn tập để sửa" idPrefix={TAB_ID_PREFIX} tabs={tabs} value={selectedEp} onChange={setSelectedEp} />
        {([0, 1, 2] as const).map((epIndex) => {
          const episode = outline.episodes[epIndex];
          return (
            <TabPanel
              key={episode.episodeNumber}
              idPrefix={TAB_ID_PREFIX}
              id={String(episode.episodeNumber)}
              value={selectedEp}
            >
              <StoryEpisodeEditor
                episode={episode}
                disabled={isPending}
                onUpdate={(updater) => updateEpisode(epIndex, updater)}
              />
            </TabPanel>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={noteId} className="font-moderator text-sm font-bold text-mod-text">
          Ghi chú thay đổi (tuỳ chọn)
        </label>
        <input
          id={noteId}
          type="text"
          disabled={isPending}
          value={note}
          onChange={(event) => update(outline, event.target.value)}
          placeholder="Ví dụ: Thêm nhịp kể về trận mai phục trên sông Bạch Đằng"
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleCancelClick}
          className="inline-flex min-h-11 items-center rounded-[10px] border border-mod-border bg-mod-surface px-4 font-moderator text-sm font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          type="button"
          disabled={isPending || rateLimit !== null || step.currentVersion === null}
          onClick={handleSave}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-4 font-moderator text-sm font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-50"
        >
          {isPending ? (
            <CircleNotch size={ICON_SIZE_MD} weight="bold" className="motion-safe:animate-spin" aria-hidden={true} />
          ) : (
            <FloppyDisk size={ICON_SIZE_MD} weight="bold" aria-hidden={true} />
          )}
          <ModeratorText>Lưu chỉnh sửa</ModeratorText>
        </button>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Bỏ thay đổi chưa lưu?"
        description="Các chỉnh sửa dàn ý bạn vừa thực hiện chưa được lưu. Bạn có chắc muốn hủy?"
        confirmLabel="Bỏ thay đổi"
        tone="danger"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          clear();
          onCancel();
        }}
      />
    </div>
  );
}
