import type { ReactElement } from "react";
import { FormField, formField } from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import type { PodcastWizardState } from "../podcastWizardState";

export interface PodcastSeriesOption {
  value: string;
  label: string;
}

export function PodcastInformationStep({
  state,
  seriesOptions,
  seriesName,
  eventName,
  readOnly,
  busy,
  hasMoreSeries,
  error,
  onLoadMore,
  onSelectSeries,
  onChange,
}: {
  state: PodcastWizardState;
  seriesOptions: PodcastSeriesOption[];
  seriesName: string;
  eventName: string;
  readOnly: boolean;
  busy: boolean;
  hasMoreSeries: boolean;
  error?: string;
  onLoadMore: () => void;
  onSelectSeries: (seriesId: string) => void;
  onChange: (value: Partial<Pick<PodcastWizardState, "title" | "description">>) => void;
}): ReactElement {
  if (readOnly) return (
    <section aria-labelledby="podcast-information-title" className="space-y-5">
      <header>
        <h2 id="podcast-information-title" className="text-lg font-bold text-mod-text">Thông tin tập podcast</h2>
        <p className="mt-1 text-sm text-mod-text-secondary">Thông tin đã lưu của tập podcast.</p>
      </header>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-mod-canvas-accent p-4"><dt className="text-xs font-semibold text-mod-text-secondary">Series</dt><dd className="mt-1 font-semibold text-mod-text">{seriesName || "Chưa chọn"}</dd></div>
        <div className="rounded-lg bg-mod-canvas-accent p-4"><dt className="text-xs font-semibold text-mod-text-secondary">Sự kiện lịch sử</dt><dd className="mt-1 font-semibold text-mod-text">{eventName || "Chưa có"}</dd></div>
        <div className="rounded-lg bg-mod-canvas-accent p-4"><dt className="text-xs font-semibold text-mod-text-secondary">Tên tập podcast</dt><dd className="mt-1 font-semibold text-mod-text">{state.title}</dd></div>
        <div className="rounded-lg bg-mod-canvas-accent p-4"><dt className="text-xs font-semibold text-mod-text-secondary">Mô tả</dt><dd className="mt-1 whitespace-pre-wrap leading-6 text-mod-text">{state.description || "Chưa có mô tả."}</dd></div>
      </dl>
    </section>
  );
  return (
    <section aria-labelledby="podcast-information-title" className="space-y-5">
      <header>
        <h2 id="podcast-information-title" className="text-lg font-bold text-mod-text">
          Thông tin tập podcast
        </h2>
        <p className="mt-1 text-sm text-mod-text-secondary">
          {state.episodeId ? "Cập nhật tên và mô tả của tập podcast." : "Chọn series và bổ sung thông tin ngắn gọn cho tập mới."}
        </p>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          {state.episodeId ? (
            <div className="space-y-4">
              <div><p className="text-sm font-semibold text-mod-text">Series</p><p className="mt-2 rounded-lg border border-mod-border bg-mod-canvas-accent px-3 py-3 text-sm text-mod-text">{seriesName || "Chưa có"}</p></div>
              <div><p className="text-sm font-semibold text-mod-text">Sự kiện lịch sử</p><p className="mt-2 rounded-lg border border-mod-border bg-mod-canvas-accent px-3 py-3 text-sm text-mod-text">{eventName || "Chưa có"}</p></div>
            </div>
          ) : (
            <>
              <FormField label="Series" htmlFor="podcast-series">
                <ModeratorSelect
                  id="podcast-series"
                  label="Series"
                  value={state.seriesId}
                  disabled={busy}
                  onValueChange={onSelectSeries}
                  options={seriesOptions}
                  placeholder="Chọn series"
                />
                {hasMoreSeries ? (
                  <Button type="button" variant="ghost" onClick={onLoadMore} disabled={busy}>
                    Tải thêm series
                  </Button>
                ) : null}
              </FormField>
              <FormField label="Sự kiện lịch sử" htmlFor="podcast-event">
                <Input
                  id="podcast-event"
                  className={formField}
                  value={eventName}
                  placeholder={state.seriesId ? "Series chưa gắn sự kiện" : "Chọn series trước"}
                  disabled
                  readOnly
                />
              </FormField>
            </>
          )}
        </div>
        <div className="space-y-4">
          <FormField label="Tên tập podcast" htmlFor="podcast-name">
            <Input
              id="podcast-name"
              className={formField}
              value={state.title}
              disabled={busy}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder="Ví dụ: Chiến thắng Bạch Đằng năm 938"
            />
          </FormField>
          <FormField label="Mô tả" htmlFor="podcast-description">
            <Textarea
              autoGrow
              id="podcast-description"
              className={`${formField} min-h-28`}
              value={state.description}
              disabled={busy}
              onChange={(event) => onChange({ description: event.target.value })}
              placeholder="Tóm tắt nội dung và góc kể của tập podcast"
            />
          </FormField>
        </div>
      </div>
      {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
    </section>
  );
}
