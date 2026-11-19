import type { ResearchConsultation } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { cn } from "@/lib/utils";
import { useGate0FocusDraft } from "../gates/gate0Drafts";
import { Callout, Chip } from "./stepUi";

export const INPUT_CLASS =
  "min-h-11 w-full rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-sm text-mod-text placeholder:text-mod-text-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-60";

const TEXTAREA_CLASS =
  "w-full resize-y rounded-[10px] border border-mod-border bg-mod-surface p-3 font-moderator text-sm text-mod-text placeholder:text-mod-text-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-60";

const NOTES_ROWS = 2;

type Gate0FocusSectionProps = {
  workflowId: number;
  data: ResearchConsultation;
};

/** Gate 0 mandatory narrative-focus selector; draft lives in the workflow UI store keyed by workflow. */
export function Gate0FocusSection({ workflowId, data }: Gate0FocusSectionProps) {
  const { draft: focusDraft, selectMenuOption, selectCustom, updateFields } = useGate0FocusDraft(workflowId);

  return (
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
  );
}
