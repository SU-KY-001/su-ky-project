import { useCallback, useId, useState } from "react";
import { ArrowDown, ArrowUp, CircleNotch, FloppyDisk, Plus, Trash } from "@phosphor-icons/react";
import { STEP_OUTPUT_SCHEMAS, type StoryEpisodeOutline, type StoryOutline, type WorkflowStep } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { useModeratorToastStore } from "@/features/moderator/toastStore";
import { errorMessage, errorRequestId, isApiError } from "@/lib/apiError";
import { useStepDecision } from "../../../hooks/useWorkflowMutations";
import { useWorkflowUiStore } from "../../../store";
import { RateLimitNotice } from "../../create/Notices";
import { ConfirmDialog } from "../dialogs/ModalDialog";
import { TabList, TabPanel, type TabDefinition } from "../Tabs";
import { Callout, Chip, Section } from "../steps/stepUi";
import {
  DEFAULT_RATE_LIMIT_SECONDS,
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  HTTP_TOO_MANY_REQUESTS,
  useGate1EditDraft,
  type RateLimitState,
} from "./gateDrafts";

const TAB_ID_PREFIX = "story-planner-edit";
const ICON_SIZE_SM = 16;
const ICON_SIZE_MD = 18;
const SPDC_ROWS = 3;
const HOOK_ROWS = 2;
const NEXT_VERSION_OFFSET = 1;

const SPDC_FIELDS: readonly { key: keyof StoryEpisodeOutline["spdcCycle"]; label: string }[] = [
  { key: "situation", label: "Bối cảnh" },
  { key: "problem", label: "Vấn đề" },
  { key: "decision", label: "Quyết định" },
  { key: "consequence", label: "Hệ quả" },
];

const INPUT_CLASS =
  "min-h-11 w-full rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-sm text-mod-text placeholder:text-mod-text-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-60";

const TEXTAREA_CLASS =
  "w-full resize-y rounded-[10px] border border-mod-border bg-mod-surface p-3 font-moderator text-sm text-mod-text placeholder:text-mod-text-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-60";

type StringListEditorProps = {
  title: string;
  items: readonly string[];
  disabled: boolean;
  onChange: (next: string[]) => void;
};

function StringListEditor({ title, items, disabled, onChange }: StringListEditorProps) {
  const handleItemChange = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const handleMove = (fromIndex: number, direction: -1 | 1) => {
    const targetIndex = fromIndex + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    const current = next[fromIndex];
    const target = next[targetIndex];
    if (current === undefined || target === undefined) return;
    next[fromIndex] = target;
    next[targetIndex] = current;
    onChange(next);
  };

  return (
    <Section title={title}>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              disabled={disabled}
              value={item}
              aria-label={`${title} dòng ${index + 1}`}
              onChange={(event) => handleItemChange(index, event.target.value)}
              className={INPUT_CLASS}
            />
            <button
              type="button"
              disabled={disabled || index === 0}
              onClick={() => handleMove(index, -1)}
              aria-label={`Chuyển dòng ${index + 1} lên`}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] border border-mod-border bg-mod-surface text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-40"
            >
              <ArrowUp size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
            </button>
            <button
              type="button"
              disabled={disabled || index === items.length - 1}
              onClick={() => handleMove(index, 1)}
              aria-label={`Chuyển dòng ${index + 1} xuống`}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] border border-mod-border bg-mod-surface text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-40"
            >
              <ArrowDown size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(items.filter((_, idx) => idx !== index))}
              aria-label={`Xoá dòng ${index + 1} khỏi ${title}`}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] border border-mod-border bg-mod-surface text-mod-danger hover:bg-mod-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-40"
            >
              <Trash size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
            </button>
          </div>
        ))}
        <div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange([...items, ""])}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
          >
            <Plus size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
            Thêm dòng
          </button>
        </div>
      </div>
    </Section>
  );
}

function validateStoryOutlineClient(outline: StoryOutline): string[] {
  const errors: string[] = [];
  if (!outline.seriesTitle.trim()) errors.push("Tiêu đề series không được để trống.");
  if (!outline.narrativeFocus.trim()) errors.push("Trọng tâm kể không được để trống.");

  for (const ep of outline.episodes) {
    const label = `Tập ${ep.episodeNumber}`;
    if (!ep.episodeTitle.trim()) errors.push(`${label}: Tiêu đề tập không được để trống.`);
    if (!ep.centralQuestion.trim()) errors.push(`${label}: Câu hỏi trung tâm không được để trống.`);
    for (const cell of SPDC_FIELDS) {
      if (!ep.spdcCycle[cell.key].trim()) {
        errors.push(`${label}: Ô "${cell.label}" không được để trống.`);
      }
    }
    if (!ep.hookEnd.trim()) errors.push(`${label}: Câu móc cuối tập không được để trống.`);
    if (ep.narrativeBeats.some((beat) => !beat.trim())) {
      errors.push(`${label}: Có dòng Nhịp kể đang để trống.`);
    }
    if (ep.pacingPlan.summaryMoments.some((item) => !item.trim())) {
      errors.push(`${label}: Có dòng Kể lướt đang để trống.`);
    }
    if (ep.pacingPlan.detailedSceneMoments.some((item) => !item.trim())) {
      errors.push(`${label}: Có dòng Kể chi tiết đang để trống.`);
    }
  }

  const parsed = STEP_OUTPUT_SCHEMAS.STORY_PLANNER.safeParse(outline);
  if (!parsed.success && errors.length === 0) {
    for (const issue of parsed.error.issues) {
      errors.push(`Trường "${issue.path.join(".")}": ${issue.message}`);
    }
  }
  return errors;
}

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
  const viewVersion = useWorkflowUiStore((state) => state.viewVersion);
  const showToast = useModeratorToastStore((state) => state.show);
  const mutation = useStepDecision(workflowId);

  const [selectedEp, setSelectedEp] = useState<string>("1");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const clearRateLimit = useCallback(() => setRateLimit(null), []);

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

  const handleSave = () => {
    if (step.currentVersion === null || mutation.isPending || rateLimit !== null) return;
    setValidationErrors([]);
    setServerError(null);

    const clientErrors = validateStoryOutlineClient(outline);
    if (clientErrors.length > 0) {
      setValidationErrors(clientErrors);
      return;
    }

    const parsed = STEP_OUTPUT_SCHEMAS.STORY_PLANNER.safeParse(outline);
    if (!parsed.success) {
      setValidationErrors(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
      return;
    }

    const currentBaseVersion = step.currentVersion;
    const trimmedNote = note.trim();

    mutation.mutate(
      {
        action: "DIRECT_EDIT",
        stepType: "STORY_PLANNER",
        baseVersion: currentBaseVersion,
        editedOutputJson: parsed.data,
        ...(trimmedNote.length > 0 ? { note: trimmedNote } : {}),
      },
      {
        onSuccess: (res) => {
          const nextVer = res.newVersion ?? currentBaseVersion + NEXT_VERSION_OFFSET;
          clear();
          viewVersion("STORY_PLANNER", null);
          showToast(`Đã lưu v${nextVer}. Chưa duyệt.`);
          onSaved();
        },
        onError: (error) => {
          if (isApiError(error, HTTP_CONFLICT)) {
            onConflict();
          } else if (isApiError(error, HTTP_BAD_REQUEST)) {
            setServerError(error.message);
          } else if (isApiError(error, HTTP_TOO_MANY_REQUESTS)) {
            setRateLimit({ seconds: error.retryAfterSeconds ?? DEFAULT_RATE_LIMIT_SECONDS, startedAt: Date.now() });
          } else {
            showToast(errorMessage(error), errorRequestId(error));
          }
        },
      },
    );
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
            disabled={mutation.isPending}
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
            disabled={mutation.isPending}
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
              <div className="flex flex-col gap-5 rounded-[12px] border border-mod-border bg-mod-surface p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <ModeratorText className="text-sm font-bold text-mod-text">
                      Tiêu đề tập {episode.episodeNumber}
                    </ModeratorText>
                    <input
                      type="text"
                      disabled={mutation.isPending}
                      value={episode.episodeTitle}
                      onChange={(event) =>
                        updateEpisode(epIndex, (prev) => ({
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
                      disabled={mutation.isPending}
                      value={episode.centralQuestion}
                      onChange={(event) =>
                        updateEpisode(epIndex, (prev) => ({
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
                          disabled={mutation.isPending}
                          value={episode.spdcCycle[cell.key]}
                          onChange={(event) =>
                            updateEpisode(epIndex, (prev) => ({
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
                  disabled={mutation.isPending}
                  onChange={(next) =>
                    updateEpisode(epIndex, (prev) => ({
                      ...prev,
                      narrativeBeats: next,
                    }))
                  }
                />

                <div className="grid gap-4 lg:grid-cols-2">
                  <StringListEditor
                    title="Kể lướt"
                    items={episode.pacingPlan.summaryMoments}
                    disabled={mutation.isPending}
                    onChange={(next) =>
                      updateEpisode(epIndex, (prev) => ({
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
                    disabled={mutation.isPending}
                    onChange={(next) =>
                      updateEpisode(epIndex, (prev) => ({
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
                    disabled={mutation.isPending}
                    value={episode.hookEnd}
                    onChange={(event) =>
                      updateEpisode(epIndex, (prev) => ({
                        ...prev,
                        hookEnd: event.target.value,
                      }))
                    }
                    className={TEXTAREA_CLASS}
                  />
                </label>
              </div>
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
          disabled={mutation.isPending}
          value={note}
          onChange={(event) => update(outline, event.target.value)}
          placeholder="Ví dụ: Thêm nhịp kể về trận mai phục trên sông Bạch Đằng"
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={handleCancelClick}
          className="inline-flex min-h-11 items-center rounded-[10px] border border-mod-border bg-mod-surface px-4 font-moderator text-sm font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          type="button"
          disabled={mutation.isPending || rateLimit !== null || step.currentVersion === null}
          onClick={handleSave}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-4 font-moderator text-sm font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-50"
        >
          {mutation.isPending ? (
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
