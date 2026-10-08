import { useCallback, useEffect, useState } from "react";
import {
  ArrowUUpLeft,
  CircleNotch,
  FloppyDisk,
  PencilSimple,
  Plus,
  Star,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  SOURCE_TIERS,
  SOURCE_TIER_LABELS,
  STEP_OUTPUT_SCHEMAS,
  type NarrativeMenuOption,
  type ResearchConsultation,
  type SourceItem,
  type SourceTier,
  type WorkflowStep,
} from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { useModeratorToastStore } from "@/features/moderator/toastStore";
import { errorMessage, errorRequestId, isApiError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { useStepDecision } from "../../../hooks/useWorkflowMutations";
import { useWorkflowUiStore } from "../../../store";
import { RateLimitNotice } from "../../create/Notices";
import {
  DEFAULT_RATE_LIMIT_SECONDS,
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  HTTP_TOO_MANY_REQUESTS,
  useGate0FocusDraft,
  useGate0SourcesDraft,
  type RateLimitState,
} from "../gates/gateDrafts";
import { SourceFormModal } from "../gates/SourceFormModal";
import { BulletList, Callout, Chip, EmptyNote, ExternalLink, ParsedOutput, Section } from "./stepUi";
import { ReliabilityScore } from "./ReliabilityScore";

type TierFilter = SourceTier | "ALL";
type SortOrder = "ORIGINAL" | "SCORE_DESC" | "SCORE_ASC";
type DeletedSourceSnapshot = { item: SourceItem; index: number };

const SELECT_CLASS =
  "min-h-11 rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-sm font-semibold text-mod-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary";

const INPUT_CLASS =
  "min-h-11 w-full rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-sm text-mod-text placeholder:text-mod-text-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-60";

const TEXTAREA_CLASS =
  "w-full resize-y rounded-[10px] border border-mod-border bg-mod-surface p-3 font-moderator text-sm text-mod-text placeholder:text-mod-text-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-60";

const ICON_SIZE_SM = 14;
const ICON_SIZE_MD = 18;
const NOTES_ROWS = 2;
const NEXT_VERSION_OFFSET = 1;

function isTierFilter(value: string): value is TierFilter {
  return value === "ALL" || SOURCE_TIERS.some((tier) => tier === value);
}

function isSortOrder(value: string): value is SortOrder {
  return value === "ORIGINAL" || value === "SCORE_DESC" || value === "SCORE_ASC";
}

function applyFilterAndSort(sources: readonly SourceItem[], tier: TierFilter, order: SortOrder): SourceItem[] {
  const filtered = tier === "ALL" ? [...sources] : sources.filter((source) => source.tier === tier);
  if (order === "SCORE_DESC") filtered.sort((a, b) => b.reliabilityScore - a.reliabilityScore);
  if (order === "SCORE_ASC") filtered.sort((a, b) => a.reliabilityScore - b.reliabilityScore);
  return filtered;
}

type SourcesTableProps = {
  sources: readonly SourceItem[];
  interactive: boolean;
  confirmingDeleteId: string | null;
  onEdit?: (source: SourceItem) => void;
  onRequestDelete?: (sourceId: string) => void;
  onConfirmDelete?: (sourceId: string) => void;
  onCancelDelete?: () => void;
};

function SourcesTable({
  sources,
  interactive,
  confirmingDeleteId,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: SourcesTableProps) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-slate-300 bg-mod-surface shadow-[0_4px_16px_rgba(15,23,42,.04)]">
      <table className="w-full border-collapse text-left font-moderator text-sm">
        <thead className="border-b border-slate-700 bg-slate-800 text-xs font-extrabold uppercase tracking-wider text-white">
          <tr>
            <th scope="col" className="px-4 py-3">Nguồn tư liệu</th>
            <th scope="col" className="px-4 py-3">Nhóm &amp; vai trò</th>
            <th scope="col" className="px-4 py-3">Độ tin cậy</th>
            <th scope="col" className="px-4 py-3">Ghi chú đối chiếu</th>
            {interactive ? <th scope="col" className="px-4 py-3 text-right">Thao tác</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {sources.map((source) => {
            const confirmingDelete = confirmingDeleteId === source.id;
            return (
              <tr key={source.id} className="align-top even:bg-slate-50/80 hover:bg-sky-50/60">
                <td className="px-4 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <ModeratorText className="text-sm font-extrabold text-mod-text">{source.name}</ModeratorText>
                    <ModeratorText className="text-xs text-mod-text-secondary">{source.authorOrOrigin}</ModeratorText>
                    {source.locationInSource ? (
                      <ModeratorText className="text-xs text-mod-text-secondary">
                        Vị trí: {source.locationInSource}
                      </ModeratorText>
                    ) : null}
                    {source.url ? (
                      <ModeratorText className="text-xs">
                        <ExternalLink url={source.url}>{source.url}</ExternalLink>
                      </ModeratorText>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    <Chip tone="info">{SOURCE_TIER_LABELS[source.tier]}</Chip>
                    {source.isPrimaryAssertionSource ? (
                      <Chip tone="success" icon={<Star size={ICON_SIZE_SM} weight="fill" aria-hidden={true} />}>
                        Nguồn khẳng định chính
                      </Chip>
                    ) : null}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  <ReliabilityScore score={source.reliabilityScore} />
                </td>
                <td className="px-4 py-3.5">
                  <ModeratorText as="p" className="text-sm text-mod-text-muted">
                    {source.crossVerificationNotes}
                  </ModeratorText>
                </td>
                {interactive ? (
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-2">
                      {confirmingDelete ? (
                        <>
                          <button
                            type="button"
                            onClick={onCancelDelete}
                            className="inline-flex min-h-11 items-center rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => onConfirmDelete?.(source.id)}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-mod-danger px-3 font-moderator text-xs font-bold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
                          >
                            <Trash size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
                            Xác nhận xoá
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onEdit?.(source)}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
                          >
                            <PencilSimple size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => onRequestDelete?.(source.id)}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-danger hover:bg-mod-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
                          >
                            <Trash size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
                            Xoá
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReadOnlyNarrativeCard({ option }: { option: NarrativeMenuOption }) {
  return (
    <li className="flex flex-col gap-2 rounded-[12px] border border-mod-border bg-mod-surface p-4">
      <ModeratorText as="h4" className="text-base font-extrabold text-mod-text">
        {option.focusLabel}
      </ModeratorText>
      <ModeratorText as="p" className="text-sm text-mod-text-muted">
        {option.angleDescription}
      </ModeratorText>
      <ModeratorText as="p" className="text-sm text-mod-text-secondary">
        <span className="font-bold text-mod-text-muted">Vì sao nên chọn: </span>
        {option.recommendedBecause}
      </ModeratorText>
      <ModeratorText as="p" className="text-sm font-bold text-mod-text">
        Series: {option.seriesTitle}
      </ModeratorText>
      <ol className="list-decimal pl-5 text-sm text-mod-text">
        {option.episodeTitles.map((title, index) => (
          <li key={index}>{title}</li>
        ))}
      </ol>
    </li>
  );
}

function ReadOnlySourcesCatalogue({ sources }: { sources: readonly SourceItem[] }) {
  const [tier, setTier] = useState<TierFilter>("ALL");
  const [order, setOrder] = useState<SortOrder>("ORIGINAL");
  const visible = applyFilterAndSort(sources, tier, order);

  return (
    <Section title={`Danh mục nguồn (${sources.length})`}>
      {sources.length === 0 ? (
        <Callout tone="attention" title="AI không tìm được đủ dữ liệu" role="status">
          Danh mục nguồn đang trống. Bạn có thể làm lại để AI tìm lại.
        </Callout>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1">
              <ModeratorText className="text-xs font-bold text-mod-text-muted">Lọc theo nhóm nguồn</ModeratorText>
              <select
                className={SELECT_CLASS}
                value={tier}
                onChange={(event) => {
                  if (isTierFilter(event.target.value)) setTier(event.target.value);
                }}
              >
                <option value="ALL">Tất cả</option>
                {SOURCE_TIERS.map((value) => (
                  <option key={value} value={value}>
                    {SOURCE_TIER_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <ModeratorText className="text-xs font-bold text-mod-text-muted">Sắp xếp</ModeratorText>
              <select
                className={SELECT_CLASS}
                value={order}
                onChange={(event) => {
                  if (isSortOrder(event.target.value)) setOrder(event.target.value);
                }}
              >
                <option value="ORIGINAL">Thứ tự AI đề xuất</option>
                <option value="SCORE_DESC">Điểm tin cậy cao trước</option>
                <option value="SCORE_ASC">Điểm tin cậy thấp trước</option>
              </select>
            </label>
          </div>
          {visible.length === 0 ? (
            <EmptyNote>Không có nguồn nào thuộc nhóm này.</EmptyNote>
          ) : (
            <SourcesTable sources={visible} interactive={false} confirmingDeleteId={null} />
          )}
        </>
      )}
    </Section>
  );
}

type InteractiveGate0ContentProps = {
  workflowId: number;
  step: WorkflowStep;
  data: ResearchConsultation;
  onConflict: () => void;
};

function InteractiveGate0Content({ workflowId, step, data, onConflict }: InteractiveGate0ContentProps) {
  const { sources, note, isDirty, updateSources, updateNote, reset } = useGate0SourcesDraft(workflowId, data);
  const { draft: focusDraft, selectMenuOption, selectCustom, updateFields } = useGate0FocusDraft(workflowId);
  const viewVersion = useWorkflowUiStore((state) => state.viewVersion);
  const showToast = useModeratorToastStore((state) => state.show);
  const mutation = useStepDecision(workflowId);

  const [tier, setTier] = useState<TierFilter>("ALL");
  const [order, setOrder] = useState<SortOrder>("ORIGINAL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<SourceItem | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletedSnapshot, setDeletedSnapshot] = useState<DeletedSourceSnapshot | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);

  const clearRateLimit = useCallback(() => setRateLimit(null), []);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const visible = applyFilterAndSort(sources, tier, order);

  const handleDeleteSource = (sourceId: string) => {
    const index = sources.findIndex((item) => item.id === sourceId);
    const target = sources[index];
    if (index < 0 || !target) return;
    setDeletedSnapshot({ item: target, index });
    setConfirmingDeleteId(null);
    updateSources(sources.filter((item) => item.id !== sourceId));
  };

  const handleUndoDelete = () => {
    if (!deletedSnapshot) return;
    const next = [...sources];
    const insertAt = Math.min(Math.max(0, deletedSnapshot.index), next.length);
    next.splice(insertAt, 0, deletedSnapshot.item);
    updateSources(next);
    setDeletedSnapshot(null);
  };

  const handleSourceModalSubmit = (submitted: SourceItem) => {
    if (editingSource) {
      updateSources(sources.map((item) => (item.id === submitted.id ? submitted : item)));
    } else {
      updateSources([...sources, submitted]);
    }
    setModalOpen(false);
    setEditingSource(null);
  };

  const handleSaveSources = () => {
    if (step.currentVersion === null || mutation.isPending || rateLimit !== null) return;
    setServerError(null);

    const updatedConsultation: ResearchConsultation = {
      ...data,
      sourcesCatalogue: sources,
    };
    const parsed = STEP_OUTPUT_SCHEMAS.RESEARCHER.safeParse(updatedConsultation);
    if (!parsed.success) {
      setServerError("Danh mục nguồn không hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }

    const currentBaseVersion = step.currentVersion;
    const trimmedNote = note.trim();

    mutation.mutate(
      {
        action: "DIRECT_EDIT",
        stepType: "RESEARCHER",
        baseVersion: currentBaseVersion,
        editedOutputJson: parsed.data,
        ...(trimmedNote.length > 0 ? { note: trimmedNote } : {}),
      },
      {
        onSuccess: (res) => {
          const nextVer = res.newVersion ?? currentBaseVersion + NEXT_VERSION_OFFSET;
          reset();
          setDeletedSnapshot(null);
          viewVersion("RESEARCHER", null);
          showToast(`Đã lưu v${nextVer}. Chưa duyệt.`);
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-[14px] border border-sky-200 border-l-4 border-l-mod-primary bg-gradient-to-br from-sky-50/90 via-white to-slate-50 p-4 shadow-[0_6px_18px_rgba(2,132,199,.07)] sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-mod-primary/15 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-mod-primary-hover">
            Tổng quan đề tài
          </span>
        </div>
        <ModeratorText as="h2" className="text-xl font-extrabold text-mod-text">
          {data.topic}
        </ModeratorText>
        <div className="grid gap-3 pt-1 lg:grid-cols-2">
          <div className="rounded-[10px] border border-sky-200/80 bg-white/90 p-3">
            <ModeratorText className="text-[11px] font-extrabold uppercase tracking-wider text-mod-primary-hover">
              Khung thời gian lịch sử
            </ModeratorText>
            <ModeratorText as="p" className="mt-1 text-sm text-mod-text">
              {data.historicalTimeframe}
            </ModeratorText>
          </div>
          <div className="rounded-[10px] border border-sky-200/80 bg-white/90 p-3">
            <ModeratorText className="text-[11px] font-extrabold uppercase tracking-wider text-mod-primary-hover">
              Phạm vi địa lý &amp; chiến trường
            </ModeratorText>
            <ModeratorText as="p" className="mt-1 text-sm text-mod-text">
              {data.geographicScope}
            </ModeratorText>
          </div>
        </div>
      </div>

      <section id="gate0-sources-section" className="flex flex-col gap-3 rounded-[14px] border border-mod-border bg-mod-canvas/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <ModeratorText as="h3" className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-mod-text">
              <span aria-hidden="true" className="h-4 w-1.5 shrink-0 rounded-full bg-mod-primary" />
              <span>Danh mục nguồn ({sources.length})</span>
            </ModeratorText>
            {isDirty ? (
              <Chip tone="attention" icon={<WarningCircle size={ICON_SIZE_SM} weight="fill" aria-hidden={true} />}>
                Có thay đổi chưa lưu
              </Chip>
            ) : null}
          </div>
          <button
            id="gate0-add-source-btn"
            type="button"
            disabled={mutation.isPending}
            onClick={() => {
              setEditingSource(null);
              setModalOpen(true);
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-mod-primary px-4 font-moderator text-xs font-extrabold text-white shadow-sm hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
          >
            <Plus size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
            Thêm nguồn
          </button>
        </div>
        {deletedSnapshot ? (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-mod-attention/40 bg-mod-attention/10 px-3.5 py-2.5"
          >
            <ModeratorText className="text-sm font-semibold text-mod-text">
              Đã xoá nguồn “{deletedSnapshot.item.name}”.
            </ModeratorText>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
            >
              <ArrowUUpLeft size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
              Hoàn tác
            </button>
          </div>
        ) : null}

        {serverError ? (
          <Callout tone="danger" title="Không thể lưu danh mục nguồn" role="alert">
            {serverError}
          </Callout>
        ) : null}

        {rateLimit ? (
          <RateLimitNotice key={rateLimit.startedAt} seconds={rateLimit.seconds} onElapsed={clearRateLimit} />
        ) : null}

        {isDirty ? (
          <div className="flex flex-col gap-3 rounded-[12px] border border-mod-attention/40 bg-mod-attention/10 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ModeratorText className="text-sm font-bold text-mod-text">
                Bạn có thay đổi danh mục nguồn chưa lưu.
              </ModeratorText>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => {
                    reset();
                    setDeletedSnapshot(null);
                  }}
                  className="inline-flex min-h-11 items-center rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
                >
                  Hoàn tác tất cả
                </button>
                <button
                  type="button"
                  disabled={mutation.isPending || rateLimit !== null || step.currentVersion === null}
                  onClick={handleSaveSources}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-mod-primary px-3.5 font-moderator text-xs font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-50"
                >
                  {mutation.isPending ? (
                    <CircleNotch size={ICON_SIZE_MD} weight="bold" className="motion-safe:animate-spin" aria-hidden={true} />
                  ) : (
                    <FloppyDisk size={ICON_SIZE_MD} weight="bold" aria-hidden={true} />
                  )}
                  Lưu chỉnh sửa
                </button>
              </div>
            </div>
            <input
              type="text"
              disabled={mutation.isPending}
              value={note}
              onChange={(event) => updateNote(event.target.value)}
              placeholder="Ghi chú thay đổi danh mục nguồn (tuỳ chọn)…"
              aria-label="Ghi chú thay đổi danh mục nguồn"
              className={INPUT_CLASS}
            />
          </div>
        ) : null}

        {sources.length === 0 ? (
          <Callout tone="attention" title="AI không tìm được đủ dữ liệu" role="status">
            Danh mục nguồn đang trống. Bạn có thể bấm Làm lại để AI tìm lại hoặc bấm Thêm nguồn để nhập thủ công.
          </Callout>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1">
                <ModeratorText className="text-xs font-bold text-mod-text-muted">Lọc theo nhóm nguồn</ModeratorText>
                <select
                  className={SELECT_CLASS}
                  value={tier}
                  onChange={(event) => {
                    if (isTierFilter(event.target.value)) setTier(event.target.value);
                  }}
                >
                  <option value="ALL">Tất cả</option>
                  {SOURCE_TIERS.map((value) => (
                    <option key={value} value={value}>
                      {SOURCE_TIER_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <ModeratorText className="text-xs font-bold text-mod-text-muted">Sắp xếp</ModeratorText>
                <select
                  className={SELECT_CLASS}
                  value={order}
                  onChange={(event) => {
                    if (isSortOrder(event.target.value)) setOrder(event.target.value);
                  }}
                >
                  <option value="ORIGINAL">Thứ tự AI đề xuất</option>
                  <option value="SCORE_DESC">Điểm tin cậy cao trước</option>
                  <option value="SCORE_ASC">Điểm tin cậy thấp trước</option>
                </select>
              </label>
            </div>
            {visible.length === 0 ? (
              <EmptyNote>Không có nguồn nào thuộc nhóm này.</EmptyNote>
            ) : (
              <SourcesTable
                sources={visible}
                interactive={true}
                confirmingDeleteId={confirmingDeleteId}
                onEdit={(source) => {
                  setEditingSource(source);
                  setModalOpen(true);
                }}
                onRequestDelete={(sourceId) => setConfirmingDeleteId(sourceId)}
                onCancelDelete={() => setConfirmingDeleteId(null)}
                onConfirmDelete={(sourceId) => handleDeleteSource(sourceId)}
              />
            )}
          </>
        )}
      </section>

      <section
        id="gate0-focus-section"
        className="flex flex-col gap-4 rounded-[16px] border-2 border-amber-300 bg-gradient-to-b from-amber-50/80 via-white to-sky-50/40 p-4 shadow-[0_8px_24px_rgba(180,83,9,.08)] sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-md bg-mod-attention px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
              Bước quyết định bắt buộc
            </span>
            <ModeratorText as="h3" className="text-base font-extrabold uppercase tracking-wide text-mod-text">
              Chọn trọng tâm kể ({data.narrativeMenu.length} gợi ý AI)
            </ModeratorText>
          </div>
          <Chip tone={focusDraft.selectedFocusType !== null ? "success" : "attention"}>
            {focusDraft.selectedFocusType !== null ? "Đã chọn hướng kể" : "Chưa chọn hướng kể"}
          </Chip>
        </div>

        {data.narrativeMenu.length === 0 ? (
          <Callout tone="attention" title="AI không tìm được đủ dữ liệu" role="status">
            Chưa có hướng kể nào được đề xuất. Bạn có thể bấm Làm lại hoặc chọn Tự nhập bên dưới.
          </Callout>
        ) : null}

        <div role="radiogroup" aria-label="Chọn trọng tâm kể" className="grid gap-3.5 lg:grid-cols-2">
          {data.narrativeMenu.map((option) => {
            const selected = focusDraft.selectedFocusType === option.focusType;
            return (
              <button
                key={option.focusType}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectMenuOption(option)}
                className={cn(
                  "flex flex-col items-start gap-2.5 rounded-[14px] border-2 p-4 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary",
                  selected
                    ? "border-mod-primary bg-sky-50/90 shadow-[0_6px_18px_rgba(2,132,199,.14)] ring-2 ring-mod-primary/20"
                    : "border-slate-200 bg-white shadow-sm hover:border-mod-primary/60 hover:bg-sky-50/30",
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <ModeratorText className="text-base font-extrabold text-mod-text">{option.focusLabel}</ModeratorText>
                  <Chip tone={selected ? "info" : "neutral"}>{selected ? "Đang chọn" : "Chọn hướng này"}</Chip>
                </div>
                <ModeratorText as="p" className="text-sm text-mod-text-muted">
                  {option.angleDescription}
                </ModeratorText>
                <ModeratorText as="p" className="text-xs text-mod-text-secondary">
                  <span className="font-bold text-mod-text-muted">Vì sao nên chọn: </span>
                  {option.recommendedBecause}
                </ModeratorText>
                <div className="mt-1 w-full rounded-[10px] border border-sky-200/80 bg-mod-canvas p-3">
                  <ModeratorText as="p" className="text-sm font-extrabold text-mod-primary-hover">
                    Series: {option.seriesTitle}
                  </ModeratorText>
                  <ol className="mt-1 list-decimal pl-5 text-xs font-semibold text-mod-text">
                    {option.episodeTitles.map((title, index) => (
                      <li key={index}>{title}</li>
                    ))}
                  </ol>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            role="radio"
            aria-checked={focusDraft.selectedFocusType === "CUSTOM"}
            onClick={selectCustom}
            className={cn(
              "flex flex-col items-start gap-2.5 rounded-[14px] border-2 p-4 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary",
              focusDraft.selectedFocusType === "CUSTOM"
                ? "border-mod-primary bg-sky-50/90 shadow-[0_6px_18px_rgba(2,132,199,.14)] ring-2 ring-mod-primary/20"
                : "border-slate-200 bg-white shadow-sm hover:border-mod-primary/60 hover:bg-sky-50/30",
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <ModeratorText className="text-base font-extrabold text-mod-text">Tự nhập</ModeratorText>
              <Chip tone={focusDraft.selectedFocusType === "CUSTOM" ? "info" : "neutral"}>
                {focusDraft.selectedFocusType === "CUSTOM" ? "Đang chọn" : "Tuỳ chỉnh"}
              </Chip>
            </div>
            <ModeratorText as="p" className="text-sm text-mod-text-muted">
              Tự đặt tiêu đề series và 3 tập theo hướng biên tập riêng của bạn.
            </ModeratorText>
          </button>
        </div>

        <div className="mt-1 flex flex-col gap-4 rounded-[12px] border border-sky-200 bg-white p-4 shadow-sm">
          <ModeratorText className="text-sm font-extrabold text-mod-text">
            {focusDraft.selectedFocusType === null
              ? "Hãy chọn một hướng kể phía trên để biên tập tiêu đề series và 3 tập"
              : "Tiêu đề series và 3 tập (bắt buộc đủ 4 ô để Duyệt & tiếp tục)"}
          </ModeratorText>
          <label className="flex flex-col gap-1">
            <ModeratorText className="text-xs font-bold text-mod-text-muted">Tiêu đề series *</ModeratorText>
            <input
              type="text"
              disabled={focusDraft.selectedFocusType === null}
              value={focusDraft.seriesTitle}
              onChange={(event) => updateFields({ seriesTitle: event.target.value })}
              placeholder="Nhập tiêu đề series…"
              className={INPUT_CLASS}
            />
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            {([0, 1, 2] as const).map((epIdx) => (
              <label key={epIdx} className="flex flex-col gap-1">
                <ModeratorText className="text-xs font-bold text-mod-text-muted">
                  Tiêu đề tập {epIdx + 1} *
                </ModeratorText>
                <input
                  type="text"
                  disabled={focusDraft.selectedFocusType === null}
                  value={focusDraft.episodeTitles[epIdx]}
                  onChange={(event) => {
                    const nextTitles: [string, string, string] = [
                      epIdx === 0 ? event.target.value : focusDraft.episodeTitles[0],
                      epIdx === 1 ? event.target.value : focusDraft.episodeTitles[1],
                      epIdx === 2 ? event.target.value : focusDraft.episodeTitles[2],
                    ];
                    updateFields({ episodeTitles: nextTitles });
                  }}
                  placeholder={`Tiêu đề tập ${epIdx + 1}…`}
                  className={INPUT_CLASS}
                />
              </label>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <ModeratorText className="text-xs font-bold text-mod-text-muted">
                Ghi chú biên tập (tuỳ chọn)
              </ModeratorText>
              <textarea
                rows={NOTES_ROWS}
                value={focusDraft.editorialNotes}
                onChange={(event) => updateFields({ editorialNotes: event.target.value })}
                placeholder="Ghi chú về góc độ lịch sử hoặc phạm vi tập trung…"
                className={TEXTAREA_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1">
              <ModeratorText className="text-xs font-bold text-mod-text-muted">
                Chỉ dẫn cho AI ở bước kế (tuỳ chọn)
              </ModeratorText>
              <textarea
                rows={NOTES_ROWS}
                value={focusDraft.incomingGuidance}
                onChange={(event) => updateFields({ incomingGuidance: event.target.value })}
                placeholder="Hướng dẫn thêm cho bước thẩm định nguồn và trích xuất sự kiện…"
                className={TEXTAREA_CLASS}
              />
            </label>
          </div>
        </div>
      </section>

      <details className="rounded-[10px] border border-mod-border bg-mod-canvas">
        <summary className="flex min-h-11 cursor-pointer items-center px-3.5 text-sm font-bold text-mod-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary">
          Câu hỏi nghiên cứu ban đầu ({data.initialResearchQuestions.length})
        </summary>
        <div className="px-3.5 pb-3.5">
          <BulletList items={data.initialResearchQuestions} />
        </div>
      </details>

      <SourceFormModal
        open={modalOpen}
        editingSource={editingSource}
        existingSources={sources}
        onClose={() => {
          setModalOpen(false);
          setEditingSource(null);
        }}
        onSubmit={handleSourceModalSubmit}
      />
    </div>
  );
}

type ResearcherPanelProps = {
  output: unknown;
  workflowId?: number;
  step?: WorkflowStep;
  interactive?: boolean;
  onConflict?: () => void;
};

/** Gate 0 view: interactive source catalogue + narrative focus selector when waiting for moderator; read-only otherwise. */
export function ResearcherPanel({
  output,
  workflowId,
  step,
  interactive = false,
  onConflict,
}: ResearcherPanelProps) {
  return (
    <ParsedOutput schema={STEP_OUTPUT_SCHEMAS.RESEARCHER} output={output}>
      {(data) => {
        if (interactive && workflowId !== undefined && step !== undefined && onConflict !== undefined) {
          return <InteractiveGate0Content workflowId={workflowId} step={step} data={data} onConflict={onConflict} />;
        }
        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 rounded-[14px] border border-sky-200 border-l-4 border-l-mod-primary bg-gradient-to-br from-sky-50/90 via-white to-slate-50 p-4 shadow-[0_6px_18px_rgba(2,132,199,.07)] sm:p-5">
              <ModeratorText as="h2" className="text-xl font-extrabold text-mod-text">
                {data.topic}
              </ModeratorText>
              <ModeratorText as="p" className="text-sm text-mod-text-secondary">
                {data.historicalTimeframe} · {data.geographicScope}
              </ModeratorText>
            </div>

            <ReadOnlySourcesCatalogue sources={data.sourcesCatalogue} />

            <Section title={`Hướng kể được đề xuất (${data.narrativeMenu.length})`}>
              {data.narrativeMenu.length === 0 ? (
                <Callout tone="attention" title="AI không tìm được đủ dữ liệu" role="status">
                  Chưa có hướng kể nào được đề xuất. Bạn có thể làm lại hoặc tự nhập trọng tâm.
                </Callout>
              ) : (
                <ul className="grid gap-3 lg:grid-cols-2">
                  {data.narrativeMenu.map((option) => (
                    <ReadOnlyNarrativeCard key={option.focusType} option={option} />
                  ))}
                </ul>
              )}
            </Section>

            <details className="rounded-[10px] border border-mod-border bg-mod-canvas">
              <summary className="flex min-h-11 cursor-pointer items-center px-3.5 text-sm font-bold text-mod-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary">
                Câu hỏi nghiên cứu ban đầu ({data.initialResearchQuestions.length})
              </summary>
              <div className="px-3.5 pb-3.5">
                <BulletList items={data.initialResearchQuestions} />
              </div>
            </details>
          </div>
        );
      }}
    </ParsedOutput>
  );
}
