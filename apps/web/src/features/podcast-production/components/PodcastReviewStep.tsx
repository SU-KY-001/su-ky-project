import { useState, type ReactElement } from "react";
import type { EpisodeWorkspaceDto, StudioSeriesDetailDto } from "@repo/shared";
import {
  BookOpen,
  CheckCircle2,
  CircleAlert,
  FileText,
  Headphones,
  LoaderCircle,
  Radio,
  Save,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/notifications";
import type { PodcastCreationWizard } from "../hooks/usePodcastCreationWizard";
import { usePodcastEpisode } from "../hooks/usePodcastProduction";
import { buildLocalReviewChecklist } from "../reviewChecklist";
import { emptyScriptDocument } from "../scriptEditor";
import { podcastProductionService as api } from "../services/podcastProductionService";
import { AudioDetails } from "./AudioDetails";

const backendChecklistLabels: Record<string, string> = {
  BASIC_INFO: "Thông tin cơ bản",
  THIRD_PERSON_SCRIPT: "Kịch bản",
  THIRD_PERSON_AUDIO: "File thu âm",
};

export function PodcastReviewStep({
  wizard,
  series,
  eventName,
  onPublished,
  readOnly,
  existingStatus,
}: {
  wizard: PodcastCreationWizard;
  series?: StudioSeriesDetailDto;
  eventName: string;
  onPublished: (seriesId: string) => void;
  readOnly: boolean;
  existingStatus?: EpisodeWorkspaceDto["status"];
}): ReactElement {
  const episode = usePodcastEpisode(wizard.state.episodeId ?? "");
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const [error, setError] = useState("");
  const narration = episode.data?.narrations.find((item) => item.type === "THIRD_PERSON");
  const attachments = episode.data?.attachments ?? [];
  const analysis = narration?.audioAnalysis ?? wizard.state.uploadedAudio?.analysis;
  const audioUrl = narration?.audio?.previewUrl ?? wizard.state.uploadedAudio?.previewUrl ?? null;
  const localChecklist = buildLocalReviewChecklist(wizard.state, attachments.length);

  const persistAll = async (): Promise<string> => {
    const id = await wizard.saveInformation();
    if (wizard.state.scriptDirty) {
      await wizard.saveScript(wizard.state.scriptDocument ?? emptyScriptDocument());
    }
    return id;
  };

  const save = async (): Promise<void> => {
    setBusy("save");
    setError("");
    try {
      await persistAll();
      await episode.refetch();
      notify.success({ title: existingStatus ? "Đã lưu thay đổi." : "Đã lưu bản nháp." });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được bản nháp.");
    } finally {
      setBusy(null);
    }
  };

  const publish = async (): Promise<void> => {
    setBusy("publish");
    setError("");
    try {
      const id = await persistAll();
      const latest = await api.episode(id);
      if (!latest.publishChecklist.ready) {
        throw new Error("Tập podcast chưa đủ điều kiện xuất bản. Kiểm tra các mục còn thiếu bên dưới.");
      }
      await api.publishEpisode(id, latest.updatedAt);
      notify.success({ title: "Đã xuất bản tập podcast." });
      onPublished(wizard.state.seriesId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không xuất bản được tập podcast.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="podcast-review-title" className="space-y-5">
      <div>
        <h2 id="podcast-review-title" className="text-lg font-bold text-mod-text">Xem lại và lưu</h2>
        <p className="mt-1 text-sm text-mod-text-secondary">Kiểm tra toàn bộ nội dung trước khi lưu bản nháp hoặc xuất bản trực tiếp.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <ReviewCard icon={Radio} title="Thông tin">
            {wizard.state.poster?.url && <figure className="mb-4"><img src={wizard.state.poster.url} alt="Poster tập podcast" className="max-h-48 max-w-full rounded-lg border border-mod-border object-contain" /><figcaption className="mt-2 break-words text-xs text-mod-text-secondary">{wizard.state.poster.fileName}</figcaption></figure>}
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-mod-text-secondary">Series</dt><dd className="mt-1 font-semibold text-mod-text">{series?.title || "Chưa chọn"}</dd></div>
              <div><dt className="text-mod-text-secondary">Tên tập</dt><dd className="mt-1 font-semibold text-mod-text">{wizard.state.title || "Chưa nhập"}</dd></div>
              <div><dt className="text-mod-text-secondary">Sự kiện lịch sử</dt><dd className="mt-1 font-semibold text-mod-text">{eventName || "Chưa có"}</dd></div>
              <div><dt className="text-mod-text-secondary">Mô tả</dt><dd className="mt-1 font-semibold text-mod-text">{wizard.state.description || "Chưa nhập"}</dd></div>
            </dl>
          </ReviewCard>

          <ReviewCard icon={FileText} title="Kịch bản">
            <div className="mod-review-script max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-mod-canvas-accent p-4 text-sm leading-7 text-mod-text" role="region" aria-label="Kịch bản" tabIndex={0}>
              {wizard.state.scriptText || "Chưa có kịch bản."}
            </div>
          </ReviewCard>

          <ReviewCard icon={BookOpen} title="Nguồn và tài liệu">
            <p className="text-sm text-mod-text-secondary">{series?.sources.length ?? 0} nguồn từ series · {attachments.length} tài liệu bổ sung</p>
            {attachments.length ? <ul className="mt-3 space-y-2 text-sm">{attachments.map((item) => <li key={item.id}><a className="font-semibold text-mod-primary hover:underline" href={item.asset.previewUrl ?? undefined} target="_blank" rel="noreferrer">{item.fileName}</a></li>)}</ul> : null}
          </ReviewCard>

          <ReviewCard icon={Headphones} title="File thu âm">
            {audioUrl ? <audio controls src={audioUrl} className="w-full" preload="metadata" /> : <p className="text-sm text-mod-text-secondary">Chưa có file thu âm.</p>}
            <div className="mt-3"><AudioDetails episodeId={wizard.state.episodeId ?? null} analysis={analysis} /></div>
          </ReviewCard>
        </div>

        <aside className="h-fit rounded-xl border border-mod-border p-4">
          <h3 className="font-bold text-mod-text">Điều kiện hoàn thành</h3>
          <ul className="mt-4 space-y-3">
            {localChecklist.map((item) => <li key={item.key} className="flex items-center gap-2 text-sm">{item.ok ? <CheckCircle2 size={17} className="text-mod-success" /> : <CircleAlert size={17} className="text-mod-attention" />}<span className={item.ok ? "text-mod-text" : "font-semibold text-mod-attention"}>{item.label}</span></li>)}
          </ul>
          {episode.data ? <div className="mt-5 border-t border-mod-border pt-4"><p className="text-xs font-bold uppercase tracking-wide text-mod-text-secondary">Checklist xuất bản</p><ul className="mt-3 space-y-2">{episode.data.publishChecklist.items.map((item) => <li key={item.key} className="flex items-center gap-2 text-sm">{item.ok ? <CheckCircle2 size={16} className="text-mod-success" /> : <CircleAlert size={16} className="text-mod-attention" />}{backendChecklistLabels[item.key] ?? item.key}</li>)}</ul></div> : null}
        </aside>
      </div>

      {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
      {!readOnly ? <div className="flex flex-wrap justify-end gap-3 border-t border-mod-border pt-4">
        <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void save()}>{busy === "save" ? <LoaderCircle className="animate-spin" /> : <Save />} {busy === "save" ? "Đang lưu…" : existingStatus ? "Lưu thay đổi" : "Lưu bản nháp"}</Button>
        {existingStatus !== "PUBLISHED" ? <Button type="button" disabled={busy !== null || Boolean(episode.data && !episode.data.publishChecklist.ready)} onClick={() => void publish()}>{busy === "publish" ? <LoaderCircle className="animate-spin" /> : <Radio />} {busy === "publish" ? "Đang xuất bản…" : "Xuất bản"}</Button> : null}
      </div> : null}
    </section>
  );
}

function ReviewCard({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: React.ReactNode }): ReactElement {
  return <section className="rounded-xl border border-mod-border p-4"><div className="mb-4 flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-mod-primary/10 text-mod-primary"><Icon size={17} /></span><h3 className="font-bold text-mod-text">{title}</h3></div>{children}</section>;
}
