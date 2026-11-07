import { CardBadge, cardBadgeToneForStatus } from "@/shared/components/dashboard/CardBadge";
import { ImageThumbnail } from "@/shared/components/common/ImageThumbnail";
import { Fragment, useState, type ReactNode } from "react";
import { useLocation, useMatch, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  LanguageTagSchema,
  PublicationEvidenceSchema,
  type StudioSeriesDetailDto,
} from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Eye } from "@phosphor-icons/react/dist/icons/Eye";
import { PencilSimple } from "@phosphor-icons/react/dist/icons/PencilSimple";
import { Trash } from "@phosphor-icons/react/dist/icons/Trash";
import { WarningCircle } from "@phosphor-icons/react/dist/icons/WarningCircle";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { TableHead, TableCell, TableRow } from "@/shared/components/ui/table";
import {
  ModeratorTable,
  InteractiveTableRow,
  EmptyTableRow,
  tableCell,
  primaryAction,
  secondaryAction,
} from "@/features/moderator/components/ModeratorTable";
import {
  ModeratorTreeNode,
  ContentKindLegend,
} from "@/features/moderator/components/ModeratorTreeNode";
import { ModeratorSectionPanel } from "@/features/moderator/components/ModeratorSectionPanel";
import { moderatorPodcastPath, moderatorPodcastPattern } from "@/features/moderator/paths";
import { ModeratorListToolbar } from "@/features/moderator/components/ModeratorListToolbar";
import { formField } from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { notify } from "@/shared/lib/notifications";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { errorMessage, isApiError } from "@/lib/apiError";
import {
  useHistoricalEntities,
  useHistoricalEvent,
} from "@/features/historical-library/hooks/useHistoricalCatalog";
import {
  usePodcastSeries,
  usePodcastSeriesDetail,
  usePodcastInvalidation,
} from "./hooks/usePodcastProduction";
import {
  NATIONAL_HISTORY_TOPIC_SLUG,
  podcastProductionService as api,
} from "./services/podcastProductionService";
import { PodcastCreation } from "./PodcastCreation";
import { SeriesCreationDialog } from "./SeriesCreationDialog";
const LANGUAGE_INPUT_MAX_CHARS = 35;
const checklistLabels: Record<string, string> = {
  TOPIC: "Cần chủ đề",
  HISTORICAL_PHASE: "Cần giai đoạn",
  YEAR_RANGE: "Cần khoảng thời gian",
  HAS_PUBLISHED_EPISODE: "Cần một tập đã phát hành",
  DESCRIPTION: "Cần mô tả series (bấm Chỉnh sửa để nhập)",
  LANGUAGE: "Cần ngôn ngữ series",
  THIRD_PERSON_SCRIPT: "Cần kịch bản",
  THIRD_PERSON_AUDIO: "Cần âm thanh",
  BASIC_INFO: "Cần thông tin tập",
};
function SeriesEvidence({
  series,
  children,
  canDelete,
  onDelete,
  deleting,
}: {
  series: StudioSeriesDetailDto;
  children: ReactNode;
  canDelete: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  const invalidate = usePodcastInvalidation();
  const [editing, setEditing] = useState(false);
  const [eventId, setEventId] = useState(series.primaryHistoricalEventId ?? "");
  const [title, setTitle] = useState(series.title);
  const [description, setDescription] = useState(series.description ?? "");
  const [language, setLanguage] = useState(series.language);
  const event = useHistoricalEvent(eventId);
  const events = useHistoricalEntities({}, editing);
  const topics = useQuery({
    queryKey: ["podcast-production", "topics"],
    queryFn: api.topics,
  });
  const topic = topics.data?.items.find(
    (item) => item.slug === NATIONAL_HISTORY_TOPIC_SLUG,
  );
  const missingChecklist = series.publishChecklist.items.filter((item) => !item.ok);
  const notifyNotPublishable = () => {
    const requirements = missingChecklist.map((item) => checklistLabels[item.key] ?? item.key);
    notify.error({
      title: "Chưa thể phát hành series",
      description: requirements.length
        ? `Cần hoàn tất: ${requirements.join(", ")}.`
        : "Series chưa đủ điều kiện. Hãy tải lại thông tin và kiểm tra checklist phát hành.",
    });
  };
  const mutation = useMutation({
    mutationFn: async (action: {
      kind: "patch" | "publish" | "hide";
    }) => {
      if (action.kind === "patch")
        await api.patch(series.id, {
          title,
          description,
          language: language.trim(),
          primaryHistoricalEventId: eventId || null,
          topicId: topic?.id ?? series.topic?.id ?? null,
          baseUpdatedAt: series.updatedAt,
        });
      else if (action.kind === "publish")
        await api.publishSeries(series.id, series.updatedAt);
      else await api.hideSeries(series.id);
    },
    onSuccess: async (_data, action) => {
      await invalidate();
      if (action.kind === "patch") setEditing(false);
      notify.success({ title: "Đã cập nhật series." });
    },
    onError: (error, action) => {
      if (action.kind !== "publish") return;
      if (isApiError(error) && error.is("SERIES_NOT_PUBLISHABLE")) {
        notifyNotPublishable();
        return;
      }
      notify.error({ title: "Không thể phát hành series", description: errorMessage(error) });
    },
  });
  const evidence = PublicationEvidenceSchema.safeParse(
    series.publicationEvidence,
  );
  const eventOptions =
    events.data?.pages.flatMap((page) =>
      page.items.map((item) => ({ value: item.id, label: item.name })),
    ) ?? [];
  if (event.data && !eventOptions.some((item) => item.value === event.data.id))
    eventOptions.push({ value: event.data.id, label: event.data.name });
  const resetEditing = () => {
    setTitle(series.title);
    setDescription(series.description ?? "");
    setLanguage(series.language);
    setEventId(series.primaryHistoricalEventId ?? "");
    setEditing(false);
  };

  return (
    <>
      <div className="mod-dialog-scroll-area min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
        <section
          className="border-b border-mod-border pb-6"
          aria-labelledby="series-information-title"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="series-information-title" className="text-lg font-semibold text-mod-text">
                Thông tin series
              </h2>
            </div>
            <CardBadge type="status" tone={cardBadgeToneForStatus(series.status)}>{series.status === "PUBLISHED" ? "Đã phát hành" : series.status === "HIDDEN" ? "Đã ẩn" : "Bản nháp"}</CardBadge>
          </div>

          {editing ? (
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-mod-text">
                Tên series
                <Input
                  className={formField}
                  value={title}
                  disabled={mutation.isPending}
                  onChange={(changeEvent) => setTitle(changeEvent.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-mod-text">
                Sự kiện chính
                <ModeratorSelect
                  label="Sự kiện chính"
                  value={eventId}
                  disabled={mutation.isPending}
                  onValueChange={setEventId}
                  options={eventOptions}
                  placeholder="Chọn sự kiện"
                />
              </label>
              <label className="text-sm font-medium text-mod-text sm:col-span-2">
                Mô tả
                <Textarea
                  autoGrow
                  className={`${formField} min-h-24`}
                  value={description}
                  disabled={mutation.isPending}
                  onChange={(changeEvent) => setDescription(changeEvent.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-mod-text">
                Ngôn ngữ
                <Input
                  className={formField}
                  value={language}
                  maxLength={LANGUAGE_INPUT_MAX_CHARS}
                  disabled={mutation.isPending}
                  aria-invalid={!LanguageTagSchema.safeParse(language).success}
                  onChange={(changeEvent) => setLanguage(changeEvent.target.value)}
                />
                <span className="mt-1 block text-xs font-normal text-mod-text-secondary">Mã BCP 47, ví dụ vi hoặc en-US.</span>
              </label>
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-mod-text">Chủ đề</p>
                <p className="mt-1 rounded-lg border border-mod-border bg-mod-surface px-3 py-3 text-sm text-mod-text">
                  Lịch sử dân tộc
                </p>
              </div>
              {events.hasNextPage ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-fit text-mod-kind-series hover:bg-mod-kind-series/10 hover:text-mod-kind-series"
                  disabled={mutation.isPending}
                  onClick={() => void events.fetchNextPage()}
                >
                  Tải thêm sự kiện
                </Button>
              ) : null}
            </div>
          ) : (
            <dl className="grid min-w-0 flex-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold text-mod-primary">Tên series</dt>
                <dd className="mt-1 font-semibold text-mod-text">{series.title}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-mod-primary">Chủ đề</dt>
                <dd className="mt-1 text-mod-text">Lịch sử dân tộc</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-semibold text-mod-primary">Mô tả</dt>
                <dd className="mt-1 whitespace-pre-wrap leading-6 text-mod-text">{series.description || "Chưa có mô tả."}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-mod-primary">Ngôn ngữ</dt>
                <dd className="mt-1 text-mod-text">{series.language}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-mod-primary">Người phụ trách</dt>
                <dd className="mt-1 text-mod-text">{series.owner.name}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-semibold text-mod-primary">Sự kiện chính</dt>
                <dd className="mt-1 font-semibold text-mod-text">{event.data?.name ?? "Chưa chọn sự kiện"}</dd>
                {event.data ? (
                  <p className="mt-1 text-sm text-mod-text-secondary">
                    {event.data.timeLabel}
                  </p>
                ) : null}
              </div>
            </dl>
          )}
        </section>

        {missingChecklist.length ? (
          <section className="rounded-lg border border-mod-attention/30 bg-mod-attention/5 p-4" aria-label="Điều kiện cần hoàn tất">
            <div className="flex items-start gap-3">
              <WarningCircle size={20} className="mt-0.5 shrink-0 text-mod-attention" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-mod-text">Điều kiện phát hành</h2>
                  <CardBadge type="status" tone="warning">Còn {missingChecklist.length} điều kiện</CardBadge>
                </div>
                <p className="mt-1 text-sm text-mod-text-secondary">Hoàn tất các mục sau để phát hành series.</p>
                <ul className="mt-3 grid gap-2 text-sm text-mod-text sm:grid-cols-2">
                  {missingChecklist.map((item) => <li key={item.key} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-mod-attention" aria-hidden="true" /><span>{checklistLabels[item.key] ?? item.key}</span></li>)}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {children}

        {evidence.success ? (
          <details className="border-b border-mod-border pb-5">
            <summary className="cursor-pointer text-sm font-semibold text-mod-text">
              Bằng chứng phát hành · {new Date(evidence.data.asOf).toLocaleString("vi-VN")}
            </summary>
            <div className="mt-3 space-y-1 text-sm text-mod-text-secondary">
              <p>{evidence.data.event.name} · phiên bản {evidence.data.event.version}</p>
              {evidence.data.sources.map((source, index) => (
                <p key={index}>{source.source.title} · {source.locator} · nguồn v{source.sourceVersion}</p>
              ))}
            </div>
          </details>
        ) : null}

        {mutation.error ? <p role="alert" className="text-sm text-mod-danger">{mutation.error.message}</p> : null}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-mod-border bg-mod-surface px-5 py-4 sm:px-7">
        {!editing && canDelete ? <Button type="button" variant="outline" className="mr-auto border-mod-danger/30 bg-mod-surface! text-mod-danger hover:bg-mod-surface! hover:text-mod-danger" disabled={deleting || mutation.isPending} onClick={onDelete}><Trash size={16} aria-hidden="true" />Xóa series</Button> : null}
        {editing ? (
          <>
            <Button type="button" variant="outline" className={secondaryAction} disabled={mutation.isPending} onClick={resetEditing}>
              Hủy chỉnh sửa
            </Button>
            <Button type="button" className={primaryAction} disabled={mutation.isPending || !title.trim() || !LanguageTagSchema.safeParse(language).success} onClick={() => mutation.mutate({ kind: "patch" })}>
              {mutation.isPending ? "Đang lưu…" : "Lưu thay đổi"}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className="border-mod-kind-series/40 bg-mod-kind-series/5 text-mod-kind-series hover:bg-mod-kind-series/15 hover:text-mod-kind-series"
              disabled={mutation.isPending}
              onClick={() => setEditing(true)}
            >
              Chỉnh sửa
            </Button>
            <Button
              type="button"
              className={primaryAction}
              disabled={mutation.isPending}
              onClick={() => {
                if (series.status !== "PUBLISHED" && missingChecklist.length > 0) {
                  notifyNotPublishable();
                  return;
                }
                mutation.mutate({ kind: series.status === "PUBLISHED" ? "hide" : "publish" });
              }}
            >
              {mutation.isPending ? "Đang xử lý…" : series.status === "PUBLISHED" ? "Ẩn series" : "Phát hành series"}
            </Button>
          </>
        )}
      </footer>
    </>
  );
}

function SeriesDetailDialog({ id, onEditEpisode, onClose }: { id: string; onEditEpisode: (id: string) => void; onClose: () => void }) {
  const series = usePodcastSeriesDetail(id);
  const user = useCurrentUser();
  const invalidate = usePodcastInvalidation();
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  const deletion = useMutation({
    mutationFn: ({ kind, targetId }: { kind: "series" | "episode"; targetId: string }) => kind === "series" ? api.deleteSeries(targetId) : api.deleteEpisode(targetId),
    onSuccess: async (_data, { kind }) => {
      if (kind === "series") onClose();
      await invalidate();
      notify.success({ title: kind === "series" ? "Đã chuyển series vào thùng rác" : "Đã chuyển tập podcast vào thùng rác" });
    },
    onError: (error) => notify.error({ title: "Không thể xóa nội dung", description: errorMessage(error) }),
  });
  const owner = Boolean(series.data && !series.data.lock && user.data?.id === series.data.owner.id);
  const remove = async (kind: "series" | "episode", targetId: string, title: string) => {
    const confirmed = await requestConfirmation({
      title: kind === "series" ? "Xóa series nháp?" : "Xóa tập podcast nháp?",
      description: kind === "series" ? `Series “${title}” sẽ được chuyển vào thùng rác; các tập bên trong sẽ tạm ẩn theo series.` : `Tập “${title}” sẽ được chuyển vào thùng rác.`,
      confirmLabel: "Xóa", destructive: true,
    });
    if (confirmed) deletion.mutate({ kind, targetId });
  };

  return (
    <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col gap-0 overflow-hidden border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0">
      <DialogHeader className="shrink-0 border-b border-mod-border px-5 py-5 pr-16 sm:px-7">
        <DialogTitle>Chi tiết series</DialogTitle>
        <DialogDescription className="text-mod-text-secondary">
          Xem thông tin series và các tập podcast thuộc series này.
        </DialogDescription>
      </DialogHeader>
      {series.isPending ? <div className="p-5"><p className="text-sm text-mod-text-secondary">Đang tải series…</p></div> : null}
      {series.error ? <div className="p-5"><p role="alert" className="text-sm text-mod-danger">{series.error.message}</p></div> : null}
      {series.data ? (
        <SeriesEvidence series={series.data} canDelete={owner && series.data.status === "DRAFT"} deleting={deletion.isPending} onDelete={() => void remove("series", series.data!.id, series.data!.title)}>
          <section
            className="border-b border-mod-border pb-6"
            aria-labelledby="series-episodes-title"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="series-episodes-title" className="text-lg font-semibold text-mod-text">Các tập trong series</h2>
                <p className="mt-1 text-sm text-mod-text-secondary">Quản lý nội dung từng tập podcast.</p>
              </div>
              <CardBadge type="status" tone="neutral">{series.data.episodes.length} tập</CardBadge>
            </div>
            {series.data.episodes.length ? (
              <ul className="divide-y divide-mod-border rounded-lg border border-mod-border">
                {series.data.episodes.map((episode) => (
                  <li key={episode.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4">
                      <ImageThumbnail src={episode.poster?.url} alt={`Poster ${episode.title}`} />
                      <div className="min-w-0 flex-1 basis-[10rem]">
                        <p className="break-words font-semibold text-mod-text">{episode.title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-mod-text-secondary">
                          <span>Tập {episode.sortOrder}</span>
                          <CardBadge type="status" tone={cardBadgeToneForStatus(episode.status)}>{episode.status === "PUBLISHED" ? "Đã phát hành" : episode.status === "HIDDEN" ? "Đã ẩn" : "Bản nháp"}</CardBadge>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pl-14 sm:pl-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-mod-border text-mod-text hover:bg-mod-canvas-accent"
                        aria-label={`Xem tập ${episode.title}`}
                        onClick={() => onEditEpisode(episode.id)}
                      >
                        Xem tập
                      </Button>
                      {owner && episode.status === "DRAFT" ? <Button type="button" variant="outline" size="sm" aria-label={`Xóa tập ${episode.title}`} className="border-mod-danger/30 bg-mod-surface! text-mod-danger hover:bg-mod-surface! hover:text-mod-danger" disabled={deletion.isPending} onClick={() => void remove("episode", episode.id, episode.title)}><Trash size={16} aria-hidden="true" />Xóa tập</Button> : null}
                      </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-mod-text-secondary">Series chưa có tập podcast.</p>}
          </section>
        </SeriesEvidence>
      ) : null}
      {confirmation ? <ConfirmationDialog {...confirmation} /> : null}
    </DialogContent>
  );
}

function SeriesBranch({
  id,
  onEditEpisode,
  status,
}: {
  id: string;
  onEditEpisode: (id: string) => void;
  status: string;
}) {
  const q = usePodcastSeriesDetail(id);
  if (q.isPending)
    return <EmptyTableRow columns={6} compact>Đang tải danh sách tập…</EmptyTableRow>;
  if (q.error)
    return (
      <EmptyTableRow columns={6} compact>
        <span role="alert">{q.error.message}</span>
      </EmptyTableRow>
    );
  const episodes = q.data.episodes.filter(
    (e) => status === "all" || e.status === status,
  );
  return (
    <>
      {episodes.map((e) => (
          <TableRow key={e.id} className="mod-tree-child">
            <TableHead scope="row" className={tableCell}>
              <div className="flex min-w-0 items-center gap-2.5 pl-7">
                <ImageThumbnail src={e.poster?.url} alt={`Poster ${e.title}`} />
                <span className="mod-tree-name">{e.title}</span>
              </div>
            </TableHead>
            <TableCell className={tableCell}>{e.sortOrder}</TableCell>
            <TableCell className={tableCell}>
              <CardBadge type="status" tone={e.progress.hasThirdPersonScript ? "success" : "warning"}>{e.progress.hasThirdPersonScript ? "Có kịch bản" : "Chưa có"}</CardBadge>
            </TableCell>
            <TableCell className={tableCell}>
              <CardBadge type="status" tone={e.progress.hasThirdPersonAudio ? "success" : "warning"}>{e.progress.hasThirdPersonAudio ? "Có âm thanh" : "Chưa có"}</CardBadge>
            </TableCell>
            <TableCell className={tableCell}>
              <CardBadge type="status" tone={cardBadgeToneForStatus(e.status)}>{e.status === "PUBLISHED"
                ? "Đã phát hành"
                : e.status === "HIDDEN"
                  ? "Đã ẩn"
                  : "Bản nháp"}</CardBadge>
            </TableCell>
            <TableCell className={tableCell}>
              <DashboardRowActions label={e.title} actions={[{ id: "edit", label: "Chỉnh sửa", icon: PencilSimple, onSelect: () => onEditEpisode(e.id) }]} />
            </TableCell>
          </TableRow>
      ))}
      {!episodes.length ? (
        <EmptyTableRow columns={6} compact>
          Series này chưa có tập podcast phù hợp.
        </EmptyTableRow>
      ) : null}
    </>
  );
}
export function PodcastWorkspace() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // useMatch ignores route ranking, so ".../new" also matches the ":id" patterns and must be excluded.
  const newSeries = Boolean(useMatch(moderatorPodcastPattern.newSeries));
  const newEpisode = Boolean(useMatch(moderatorPodcastPattern.newEpisode));
  const seriesParam = useMatch(moderatorPodcastPattern.series)?.params.seriesId;
  const episodeParam = useMatch(moderatorPodcastPattern.episode)?.params.episodeId;
  const detailSeriesId = newSeries ? undefined : seriesParam;
  const editingEpisodeId = newEpisode ? undefined : episodeParam;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const setFilter = (key: "q" | "status", value: string, emptyValue: string) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value === emptyValue) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  const setQ = (value: string) => setFilter("q", value, "");
  const setStatus = (value: string) => setFilter("status", value, "all");
  // Keep list filters across list <-> detail/creation navigation.
  const go = (pathname: string) => navigate({ pathname, search });
  const series = usePodcastSeries(q);
  const rows = series.data?.pages.flatMap((p) => p.items) ?? [];
  const finishCreation = () => navigate(moderatorPodcastPath.list);
  if (newEpisode || editingEpisodeId)
    return (
      <PodcastCreation
        episodeId={editingEpisodeId}
        onBack={() => go(moderatorPodcastPath.list)}
        onSaved={finishCreation}
      />
    );
  const toggle = (id: string) =>
    setExpanded((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <>
      <section className="space-y-5 font-moderator">
        <header>
          <h1 className="text-2xl font-bold">Sản xuất podcast</h1>
          <p className="mt-1 text-sm text-mod-text-secondary">
            Series, tập và trích dẫn lịch sử dùng trong nội dung.
          </p>
        </header>
        <ModeratorSectionPanel
          title="Danh sách series và tập podcast"
          eyebrow="SẢN XUẤT PODCAST"
          summary={`${series.data?.pages[0]?.total ?? 0} series`}
          toolbar={
            <ModeratorListToolbar
              searchLabel="Tìm series"
              searchValue={q}
              onSearchChange={setQ}
              filters={[
                {
                  id: "status",
                  label: "Trạng thái",
                  value: status,
                  onValueChange: setStatus,
                  options: [
                    { value: "all", label: "Tất cả trạng thái" },
                    { value: "DRAFT", label: "Bản nháp" },
                    { value: "PUBLISHED", label: "Đã phát hành" },
                    { value: "HIDDEN", label: "Đã ẩn" },
                  ],
                },
              ]}
              actions={
                <>
                  <Button
                    variant="outline"
                    className={secondaryAction}
                    onClick={() => go(moderatorPodcastPath.newSeries)}
                  >
                    Tạo series
                  </Button>
                  <Button
                    className={primaryAction}
                    onClick={() => go(moderatorPodcastPath.newEpisode)}
                  >
                    Tạo podcast
                  </Button>
                </>
              }
            />
          }
        >
        <ModeratorTable
          embedded
          caption="Series và các tập podcast"
          columns={["Nội dung", "Số tập", "Kịch bản", "Âm thanh", "Trạng thái", "Thao tác"]}
          columnWidths={["38%", "8%", "12%", "12%", "13%", "17%"]}
          minWidth={1080}
        >
          {rows.map((s) => (
            <Fragment key={s.id}>
              <InteractiveTableRow
                expanded={expanded.has(s.id)}
                onActivate={() => toggle(s.id)}
                className="mod-tree-root"
              >
                <TableHead scope="row" className={tableCell}>
                  <ModeratorTreeNode
                    kind="series"
                    name={s.title}
                    open={expanded.has(s.id)}
                    onClick={() => toggle(s.id)}
                  />
                </TableHead>
                <TableCell className={tableCell}>
                  {s.episodeCounts.total}
                </TableCell>
                <TableCell className={tableCell}>—</TableCell>
                <TableCell className={tableCell}>—</TableCell>
                <TableCell className={tableCell}>
                  <CardBadge type="status" tone={cardBadgeToneForStatus(s.status)}>{s.status === "PUBLISHED"
                    ? "Đã phát hành"
                    : s.status === "HIDDEN"
                      ? "Đã ẩn"
                      : "Bản nháp"}</CardBadge>
                </TableCell>
                <TableCell className={tableCell}>
                  <DashboardRowActions label={s.title} actions={[{ id: "detail", label: "Xem chi tiết", icon: Eye, onSelect: () => go(moderatorPodcastPath.series(s.id)) }]} />
                </TableCell>
              </InteractiveTableRow>
              {expanded.has(s.id) ? (
                <SeriesBranch
                  id={s.id}
                  onEditEpisode={(id) => go(moderatorPodcastPath.episode(id))}
                  status={status}
                />
              ) : null}
            </Fragment>
          ))}
          {series.isPending || series.error || !rows.length ? (
            <EmptyTableRow columns={6}>
              {series.isPending ? (
                "Đang tải…"
              ) : series.error ? (
                <span role="alert">{series.error.message}</span>
              ) : (
                "Chưa có series phù hợp."
              )}
            </EmptyTableRow>
          ) : null}
          {series.hasNextPage ? (
            <TableRow>
              <TableCell colSpan={6}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    void series.fetchNextPage();
                  }}
                >
                  Tải thêm series
                </Button>
              </TableCell>
            </TableRow>
          ) : null}
        </ModeratorTable>
        <ContentKindLegend kinds={["series", "episode"]} />
        </ModeratorSectionPanel>
      </section>
      <Dialog
        open={newSeries}
        onOpenChange={(open) => {
          if (!open) go(moderatorPodcastPath.list);
        }}
      >
        {newSeries ? (
          <SeriesCreationDialog
            onBack={() => go(moderatorPodcastPath.list)}
            onSaved={finishCreation}
          />
        ) : null}
      </Dialog>
      <Dialog
        open={Boolean(detailSeriesId)}
        onOpenChange={(open) => {
          if (!open) go(moderatorPodcastPath.list);
        }}
      >
        {detailSeriesId ? <SeriesDetailDialog id={detailSeriesId} onEditEpisode={(id) => go(moderatorPodcastPath.episode(id))} onClose={() => go(moderatorPodcastPath.list)} /> : null}
      </Dialog>
    </>
  );
}
