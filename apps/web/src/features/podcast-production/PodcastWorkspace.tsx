import { Fragment, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  PublicationEvidenceSchema,
  type StudioSeriesDetailDto,
} from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
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
  ContentKindIcon,
  ContentKindLegend,
} from "@/features/moderator/components/ModeratorTreeNode";
import { ModeratorSectionPanel } from "@/features/moderator/components/ModeratorSectionPanel";
import { ModeratorListToolbar } from "@/features/moderator/components/ModeratorListToolbar";
import { formField } from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { notify } from "@/shared/lib/notifications";
import { newIdempotencyKey } from "@/lib/idempotency";
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
const checklistLabels: Record<string, string> = {
  TOPIC: "Cần chủ đề",
  HISTORICAL_PHASE: "Cần giai đoạn",
  YEAR_RANGE: "Cần khoảng thời gian",
  HAS_SOURCE: "Cần nguồn tư liệu",
  HAS_PUBLISHED_EPISODE: "Cần một tập đã phát hành",
  THIRD_PERSON_SCRIPT: "Cần kịch bản",
  THIRD_PERSON_AUDIO: "Cần âm thanh",
  BASIC_INFO: "Cần thông tin tập",
};
function SeriesEvidence({
  series,
  children,
}: {
  series: StudioSeriesDetailDto;
  children: ReactNode;
}) {
  const invalidate = usePodcastInvalidation();
  const [editing, setEditing] = useState(false);
  const [eventId, setEventId] = useState(series.primaryHistoricalEventId ?? "");
  const [title, setTitle] = useState(series.title);
  const [description, setDescription] = useState(series.description ?? "");
  const event = useHistoricalEvent(eventId);
  const events = useHistoricalEntities({}, editing);
  const topics = useQuery({
    queryKey: ["podcast-production", "topics"],
    queryFn: api.topics,
  });
  const topic = topics.data?.items.find(
    (item) => item.slug === NATIONAL_HISTORY_TOPIC_SLUG,
  );
  const mutation = useMutation({
    mutationFn: async (action: {
      kind: "patch" | "source" | "remove" | "publish" | "hide";
      id?: string;
    }) => {
      if (action.kind === "patch")
        await api.patch(series.id, {
          title,
          description,
          primaryHistoricalEventId: eventId || null,
          topicId: topic?.id ?? series.topic?.id ?? null,
          baseUpdatedAt: series.updatedAt,
        });
      else if (action.kind === "source" && action.id)
        await api.addCitation(series.id, action.id, newIdempotencyKey());
      else if (action.kind === "remove" && action.id)
        await api.removeSource(series.id, action.id);
      else if (action.kind === "publish")
        await api.publishSeries(series.id, series.updatedAt);
      else await api.hideSeries(series.id);
    },
    onSuccess: async (_data, action) => {
      await invalidate();
      if (action.kind === "patch") setEditing(false);
      notify.success({ title: "Đã cập nhật series." });
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
  const missingChecklist = series.publishChecklist.items.filter((item) => !item.ok);

  const resetEditing = () => {
    setTitle(series.title);
    setDescription(series.description ?? "");
    setEventId(series.primaryHistoricalEventId ?? "");
    setEditing(false);
  };

  return (
    <>
      <div className="mod-dialog-scroll-area min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
        <section
          className="rounded-xl border border-mod-kind-series/30 bg-mod-kind-series/5 p-4 sm:p-5"
          aria-labelledby="series-information-title"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex rounded-full bg-mod-kind-series/15 px-2.5 py-1 text-xs font-bold tracking-wide text-mod-kind-series">
                SERIES
              </span>
              <h2 id="series-information-title" className="mt-2 text-lg font-bold text-mod-text">
                Thông tin series
              </h2>
            </div>
            <span className="rounded-full border border-mod-kind-series/25 bg-mod-surface px-3 py-1 text-xs font-semibold text-mod-kind-series">
              {series.status === "PUBLISHED" ? "Đã phát hành" : series.status === "HIDDEN" ? "Đã ẩn" : "Bản nháp"}
            </span>
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
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-mod-text-secondary">Tên series</dt>
                <dd className="mt-1 font-semibold text-mod-text">{series.title}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-mod-text-secondary">Chủ đề</dt>
                <dd className="mt-1 text-mod-text">Lịch sử dân tộc</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-mod-text-secondary">Mô tả</dt>
                <dd className="mt-1 whitespace-pre-wrap leading-6 text-mod-text">{series.description || "Chưa có mô tả."}</dd>
              </div>
              <div className="sm:col-span-2 rounded-lg border border-mod-kind-series/20 bg-mod-surface/80 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-mod-text-secondary">Sự kiện chính</dt>
                <dd className="mt-1 font-semibold text-mod-text">{event.data?.name ?? "Chưa chọn sự kiện"}</dd>
                {event.data ? (
                  <p className="mt-1 text-sm text-mod-text-secondary">
                    {event.data.timeLabel} · {event.data.readiness.ready ? "Đủ điều kiện" : "Cần hoàn tất kiểm duyệt"}
                  </p>
                ) : null}
              </div>
            </dl>
          )}
        </section>

        {event.data ? (
          <section className="rounded-xl border border-mod-border bg-mod-surface p-4 sm:p-5" aria-labelledby="series-sources-title">
            <div className="mb-4">
              <h2 id="series-sources-title" className="font-bold text-mod-text">Nguồn tư liệu</h2>
              <p className="mt-1 text-sm text-mod-text-secondary">Các trích dẫn được gắn với series và sự kiện chính.</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-mod-text">Nguồn đã chọn</h3>
              {series.sources.length ? series.sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between gap-3 rounded-lg bg-mod-canvas-accent px-3 py-2.5 text-sm">
                  <span className="min-w-0 text-mod-text"><strong>{source.source.title}</strong>{source.locator ? ` · ${source.locator}` : ""}</span>
                  {editing ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      className="text-mod-danger hover:bg-mod-danger/10 hover:text-mod-danger"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ kind: "remove", id: source.id })}
                    >
                      Gỡ
                    </Button>
                  ) : null}
                </div>
              )) : <p className="rounded-lg border border-dashed border-mod-border p-3 text-sm text-mod-text-secondary">Chưa chọn nguồn.</p>}
            </div>

            {editing ? (
              <div className="mt-5 space-y-2">
                <h3 className="text-sm font-semibold text-mod-text">Trích dẫn có thể chọn</h3>
                {event.data.citations.length ? event.data.citations.map((citation) => {
                  const selected = series.sources.some((source) => source.source.id === citation.sourceId && source.locator === citation.locator);
                  return (
                    <div key={citation.id} className="flex items-center justify-between gap-3 rounded-lg border border-mod-border px-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-mod-text">{citation.source.title}</p>
                        <p className="mt-0.5 text-xs text-mod-text-secondary">
                          {citation.locator || "Chưa có vị trí trích"} · {citation.outdated ? "Phiên bản cũ" : citation.source.verificationStatus === "VERIFIED" ? "Đã xác minh" : "Chưa xác minh"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={mutation.isPending || selected}
                        onClick={() => mutation.mutate({ kind: "source", id: citation.id })}
                      >
                        {selected ? "Đã chọn" : "Chọn"}
                      </Button>
                    </div>
                  );
                }) : <p className="text-sm text-mod-text-secondary">Sự kiện chưa có trích dẫn.</p>}
              </div>
            ) : null}
          </section>
        ) : null}

        {missingChecklist.length ? (
          <section className="rounded-xl border border-mod-attention/30 bg-mod-attention/5 p-4" aria-label="Điều kiện cần hoàn tất">
            <h2 className="text-sm font-bold text-mod-text">Điều kiện cần hoàn tất</h2>
            <ul className="mt-2 grid gap-1 text-sm text-mod-text-secondary sm:grid-cols-2">
              {missingChecklist.map((item) => <li key={item.key}>• {checklistLabels[item.key] ?? item.key}</li>)}
            </ul>
          </section>
        ) : null}

        {children}

        {evidence.success ? (
          <details className="rounded-xl border border-mod-border bg-mod-surface p-4">
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

      <footer className="flex shrink-0 justify-end gap-3 border-t border-mod-border bg-mod-surface px-5 py-3">
        {editing ? (
          <>
            <Button type="button" variant="outline" className={secondaryAction} disabled={mutation.isPending} onClick={resetEditing}>
              Hủy chỉnh sửa
            </Button>
            <Button type="button" className={primaryAction} disabled={mutation.isPending || !title.trim()} onClick={() => mutation.mutate({ kind: "patch" })}>
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
              onClick={() => mutation.mutate({ kind: series.status === "PUBLISHED" ? "hide" : "publish" })}
            >
              {mutation.isPending ? "Đang xử lý…" : series.status === "PUBLISHED" ? "Ẩn series" : "Phát hành series"}
            </Button>
          </>
        )}
      </footer>
    </>
  );
}

function SeriesDetailDialog({ id, onEditEpisode }: { id: string; onEditEpisode: (id: string) => void }) {
  const series = usePodcastSeriesDetail(id);

  return (
    <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col gap-0 overflow-hidden border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0">
      <DialogHeader className="shrink-0 border-b border-mod-border px-5 py-4 pr-16">
        <DialogTitle>Chi tiết series</DialogTitle>
        <DialogDescription className="text-mod-text-secondary">
          Xem thông tin series và các tập podcast thuộc series này.
        </DialogDescription>
      </DialogHeader>
      {series.isPending ? <div className="p-5"><p className="text-sm text-mod-text-secondary">Đang tải series…</p></div> : null}
      {series.error ? <div className="p-5"><p role="alert" className="text-sm text-mod-danger">{series.error.message}</p></div> : null}
      {series.data ? (
        <SeriesEvidence series={series.data}>
          <section
            className="rounded-xl border border-mod-kind-episode/30 bg-mod-kind-episode/5 p-4 sm:p-5"
            aria-labelledby="series-episodes-title"
          >
            <div className="mb-4">
              <span className="inline-flex rounded-full bg-mod-kind-episode/15 px-2.5 py-1 text-xs font-bold tracking-wide text-mod-kind-episode">
                TẬP PODCAST
              </span>
              <h2 id="series-episodes-title" className="mt-2 text-lg font-bold text-mod-text">Các tập trong series</h2>
              <p className="mt-1 text-sm text-mod-text-secondary">{series.data.episodes.length} tập podcast</p>
            </div>
            {series.data.episodes.length ? (
              <div className="space-y-2">
                {series.data.episodes.map((episode) => (
                  <div key={episode.id} className="overflow-hidden rounded-lg border border-mod-kind-episode/25 bg-mod-surface">
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-mod-text">{episode.title}</p>
                        <p className="mt-1 text-xs text-mod-text-secondary">
                          Tập {episode.sortOrder} · {episode.status === "PUBLISHED" ? "Đã phát hành" : episode.status === "HIDDEN" ? "Đã ẩn" : "Bản nháp"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-mod-kind-episode/30 text-mod-kind-episode hover:bg-mod-kind-episode/10 hover:text-mod-kind-episode"
                        onClick={() => onEditEpisode(episode.id)}
                      >
                        Xem tập
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="rounded-lg border border-dashed border-mod-kind-episode/30 bg-mod-surface/70 p-4 text-sm text-mod-text-secondary">Series chưa có tập podcast.</p>}
          </section>
        </SeriesEvidence>
      ) : null}
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
    return <EmptyTableRow columns={6}>Đang tải danh sách tập…</EmptyTableRow>;
  if (q.error)
    return (
      <EmptyTableRow columns={6}>
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
              <div className="flex items-center gap-2.5 pl-7">
                <ContentKindIcon kind="episode" />
                <span className="mod-tree-name">{e.title}</span>
              </div>
            </TableHead>
            <TableCell className={tableCell}>{e.sortOrder}</TableCell>
            <TableCell className={tableCell}>
              {e.progress.hasThirdPersonScript ? "Có kịch bản" : "Chưa có"}
            </TableCell>
            <TableCell className={tableCell}>
              {e.progress.hasThirdPersonAudio ? "Có âm thanh" : "Chưa có"}
            </TableCell>
            <TableCell className={tableCell}>
              {e.status === "PUBLISHED"
                ? "Đã phát hành"
                : e.status === "HIDDEN"
                  ? "Đã ẩn"
                  : "Bản nháp"}
            </TableCell>
            <TableCell className={tableCell}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditEpisode(e.id)}
              >
                Chỉnh sửa
              </Button>
            </TableCell>
          </TableRow>
      ))}
      {!episodes.length ? (
        <EmptyTableRow columns={6}>
          Series này chưa có tập podcast phù hợp.
        </EmptyTableRow>
      ) : null}
    </>
  );
}
export function PodcastWorkspace({
  initialKind,
}: {
  initialKind?: "series" | "episode";
}) {
  const [creation, setCreation] = useState<"series" | "episode" | null>(
    initialKind ?? null,
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [detailSeriesId, setDetailSeriesId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const series = usePodcastSeries(q);
  const rows = series.data?.pages.flatMap((p) => p.items) ?? [];
  const finishCreation = () => {
    setCreation(null);
    setEditingEpisodeId(null);
    setQ("");
    setStatus("all");
  };
  if (creation === "episode" || editingEpisodeId)
    return (
      <PodcastCreation
        episodeId={editingEpisodeId ?? undefined}
        onBack={() => { setCreation(null); setEditingEpisodeId(null); }}
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
                    onClick={() => setCreation("series")}
                  >
                    Tạo series
                  </Button>
                  <Button
                    className={primaryAction}
                    onClick={() => setCreation("episode")}
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
                  {s.status === "PUBLISHED"
                    ? "Đã phát hành"
                    : s.status === "HIDDEN"
                      ? "Đã ẩn"
                      : "Bản nháp"}
                </TableCell>
                <TableCell className={tableCell}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailSeriesId(s.id)}
                  >
                    Xem chi tiết
                  </Button>
                </TableCell>
              </InteractiveTableRow>
              {expanded.has(s.id) ? (
                <SeriesBranch
                  id={s.id}
                  onEditEpisode={setEditingEpisodeId}
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
        open={creation === "series"}
        onOpenChange={(open) => {
          if (!open) setCreation(null);
        }}
      >
        {creation === "series" ? (
          <SeriesCreationDialog
            onBack={() => setCreation(null)}
            onSaved={finishCreation}
          />
        ) : null}
      </Dialog>
      <Dialog
        open={Boolean(detailSeriesId)}
        onOpenChange={(open) => {
          if (!open) setDetailSeriesId(null);
        }}
      >
        {detailSeriesId ? <SeriesDetailDialog id={detailSeriesId} onEditEpisode={(id) => { setDetailSeriesId(null); setEditingEpisodeId(id); }} /> : null}
      </Dialog>
    </>
  );
}
