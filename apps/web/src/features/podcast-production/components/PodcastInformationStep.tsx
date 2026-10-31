import type { ReactElement } from "react";
import type { EpisodePoster } from "@repo/shared";
import { FormField, formField } from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import type { PodcastWizardState } from "../podcastWizardState";
import { PodcastPosterField } from "./PodcastPosterField";

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
  onPosterChange,
  onPosterBusyChange,
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
  onPosterChange: (poster: EpisodePoster | null) => void;
  onPosterBusyChange: (busy: boolean) => void;
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
      <PodcastPosterField value={state.poster} busy={busy} readOnly onChange={onPosterChange} onBusyChange={onPosterBusyChange} />
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
      <div className="space-y-5">
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <FormField label="Series" htmlFor="podcast-series">
            {state.episodeId ? (
              <Input id="podcast-series" className={`${formField} h-11`} value={seriesName || "Chưa có"} disabled readOnly />
            ) : (
              <ModeratorSelect id="podcast-series" label="Series" value={state.seriesId} disabled={busy} onValueChange={onSelectSeries} options={seriesOptions} placeholder="Chọn series" />
            )}
          </FormField>
          <FormField label="Sự kiện lịch sử" htmlFor="podcast-event">
            <Input id="podcast-event" className={`${formField} h-11`} value={eventName} placeholder={state.seriesId ? "Series chưa gắn sự kiện" : "Chọn series trước"} disabled readOnly />
          </FormField>
        </div>
        {!state.episodeId && hasMoreSeries && <Button type="button" variant="ghost" size="sm" onClick={onLoadMore} disabled={busy}>Tải thêm series</Button>}
        <FormField label="Tên tập podcast" htmlFor="podcast-name">
          <Input id="podcast-name" className={`${formField} h-11`} value={state.title} disabled={busy} onChange={(event) => onChange({ title: event.target.value })} placeholder="Ví dụ: Chiến thắng Bạch Đằng năm 938" />
        </FormField>
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <FormField label="Mô tả" htmlFor="podcast-description">
            <Textarea id="podcast-description" className={`${formField} h-56 min-h-56 resize-none overflow-y-auto`} value={state.description} disabled={busy} onChange={(event) => onChange({ description: event.target.value })} placeholder="Tóm tắt nội dung và góc kể của tập podcast" />
          </FormField>
          <PodcastPosterField value={state.poster} busy={busy} readOnly={false} onChange={onPosterChange} onBusyChange={onPosterBusyChange} />
        </div>
      </div>
      {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
    </section>
  );
}
