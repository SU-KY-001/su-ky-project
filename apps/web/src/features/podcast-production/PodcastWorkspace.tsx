import { Fragment, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  PublicationEvidenceSchema,
  type StudioSeriesDetailDto,
} from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { TableHead, TableCell, TableRow } from "@/shared/components/ui/table";
import {
  ModeratorTable,
  InteractiveTableRow,
  EmptyTableRow,
  tableCell,
  primaryAction,
} from "@/features/moderator/components/ModeratorTable";
import {
  ModeratorTreeNode,
  ContentKindLegend,
} from "@/features/moderator/components/ModeratorTreeNode";
import { ModeratorSectionPanel } from "@/features/moderator/components/ModeratorSectionPanel";
import { ModeratorListToolbar } from "@/features/moderator/components/ModeratorListToolbar";
import { formField } from "@/features/moderator/components/CreationPage";
import { notify } from "@/shared/lib/notifications";
import { newIdempotencyKey } from "@/lib/idempotency";
import {
  useHistoricalEntities,
  useHistoricalEvent,
} from "@/features/historical-library/hooks/useHistoricalCatalog";
import { uploadCatalogMedia } from "@/features/historical-library/services/catalogMediaService";
import {
  usePodcastSeries,
  usePodcastSeriesDetail,
  usePodcastEpisode,
  usePodcastInvalidation,
} from "./hooks/usePodcastProduction";
import { podcastProductionService as api } from "./services/podcastProductionService";
import { PodcastCreation } from "./PodcastCreation";
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
function EpisodeEditor({ id }: { id: string }) {
  const q = usePodcastEpisode(id);
  const invalidate = usePodcastInvalidation();
  const [script, setScript] = useState<string>();
  const [file, setFile] = useState<File>();
  const mutation = useMutation({
    mutationFn: async (action: "save" | "publish" | "hide" | "audio") => {
      if (!q.data) return;
      const third = q.data.narrations.find((n) => n.type === "THIRD_PERSON");
      if (action === "save")
        await api.script(id, {
          scriptContent: script ?? third?.scriptContent ?? "",
          baseUpdatedAt: third?.updatedAt,
        });
      else if (action === "audio") {
        if (!file) throw new Error("Chọn tệp âm thanh trước.");
        const asset = await uploadCatalogMedia(file, "AUDIO");
        await api.audio(id, asset);
      } else if (action === "publish")
        await api.publishEpisode(id, q.data.updatedAt);
      else await api.hideEpisode(id);
    },
    onSuccess: async () => {
      await invalidate();
      setScript(undefined);
      notify.success({ title: "Đã cập nhật tập podcast." });
    },
  });
  if (q.isPending) return <p>Đang tải tập…</p>;
  if (q.error) return <p role="alert">{q.error.message}</p>;
  const episode = q.data,
    third = episode.narrations.find((n) => n.type === "THIRD_PERSON");
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{episode.title}</h2>
      <p className="text-sm">{episode.description || "Chưa có mô tả."}</p>
      <label className="block text-sm">
        Kịch bản
        <textarea
          aria-label="Kịch bản tập"
          className={formField + " min-h-48"}
          value={script ?? third?.scriptContent ?? ""}
          onChange={(e) => setScript(e.target.value)}
        />
      </label>
      <Button
        disabled={mutation.isPending}
        onClick={() => mutation.mutate("save")}
      >
        Lưu kịch bản
      </Button>
      <label className="block text-sm">
        Âm thanh
        <input
          type="file"
          accept="audio/*"
          className={formField}
          onChange={(e) => setFile(e.target.files?.[0])}
        />
      </label>
      <Button
        variant="outline"
        disabled={!file || mutation.isPending}
        onClick={() => mutation.mutate("audio")}
      >
        Tải và gắn âm thanh
      </Button>
      {third?.audio?.previewUrl ? (
        <audio controls src={third.audio.previewUrl} className="w-full" />
      ) : null}
      <ul className="text-xs text-mod-text-secondary">
        {episode.publishChecklist.items
          .filter((i) => !i.ok)
          .map((i) => (
            <li key={i.key}>{checklistLabels[i.key] ?? i.key}</li>
          ))}
        {third?.warnings.map((w) => (
          <li key={w.key}>
            {w.key === "SCRIPT_CHANGED_AFTER_AUDIO"
              ? "Kịch bản đã đổi sau khi gắn âm thanh."
              : "Thời lượng âm thanh khác thời lượng ước tính."}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          disabled={mutation.isPending || script !== undefined}
          onClick={() => mutation.mutate("publish")}
        >
          Phát hành tập
        </Button>
        {episode.status === "PUBLISHED" ? (
          <Button
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("hide")}
          >
            Ẩn tập
          </Button>
        ) : null}
      </div>
      {mutation.error ? (
        <p role="alert" className="text-sm text-mod-danger">
          {mutation.error.message}
        </p>
      ) : null}
    </section>
  );
}
function SeriesEvidence({ series }: { series: StudioSeriesDetailDto }) {
  const invalidate = usePodcastInvalidation();
  const event = useHistoricalEvent(series.primaryHistoricalEventId ?? "");
  const events = useHistoricalEntities();
  const topics = useQuery({
    queryKey: ["podcast-production", "topics"],
    queryFn: api.topics,
  });
  const [eventId, setEventId] = useState(series.primaryHistoricalEventId ?? "");
  const [topicId, setTopicId] = useState(series.topic?.id ?? "");
  const [title, setTitle] = useState(series.title);
  const [description, setDescription] = useState(series.description ?? "");
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
          topicId: topicId || null,
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
    onSuccess: async () => {
      await invalidate();
      notify.success({ title: "Đã cập nhật series." });
    },
  });
  const evidence = PublicationEvidenceSchema.safeParse(
    series.publicationEvidence,
  );
  return (
    <section className="space-y-4" aria-label="Bằng chứng của series">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Tên series
          <input
            className={formField}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Mô tả
          <textarea
            className={formField}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Sự kiện chính
          <select
            className={formField}
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="">Chọn sự kiện</option>
            {events.data?.pages
              .flatMap((p) => p.items)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            {event.data &&
            !events.data?.pages.some((p) =>
              p.items.some((e) => e.id === event.data.id),
            ) ? (
              <option value={event.data.id}>{event.data.name}</option>
            ) : null}
          </select>
        </label>
        <label className="text-sm">
          Chủ đề
          <select
            className={formField}
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
          >
            <option value="">Chọn chủ đề</option>
            {topics.data?.items.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {events.hasNextPage ? (
        <Button
          variant="ghost"
          onClick={() => {
            void events.fetchNextPage();
          }}
        >
          Tải thêm sự kiện
        </Button>
      ) : null}
      <Button
        disabled={mutation.isPending}
        onClick={() => mutation.mutate({ kind: "patch" })}
      >
        Lưu thông tin và phiên bản sự kiện hiện tại
      </Button>
      {event.data ? (
        <>
          <p className="text-sm">
            {event.data.name} · {event.data.timeLabel} ·{" "}
            {event.data.readiness.ready
              ? "Đủ điều kiện"
              : "Cần hoàn tất kiểm duyệt"}
          </p>
          <h3 className="font-semibold">Nguồn đã chọn cho series</h3>
          {series.sources.length ? (
            series.sources.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>
                  {s.source.title} · {s.locator}
                </span>
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ kind: "remove", id: s.id })}
                >
                  Gỡ nguồn
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm">Chưa chọn nguồn.</p>
          )}
          <h3 className="font-semibold">Trích dẫn có thể chọn</h3>
          {event.data.citations.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span>
                {c.source.title} · {c.locator} ·{" "}
                {c.outdated
                  ? "Phiên bản cũ"
                  : c.source.verificationStatus === "VERIFIED"
                    ? "Đã xác minh"
                    : "Chưa xác minh"}
              </span>
              <Button
                size="xs"
                variant="outline"
                disabled={
                  mutation.isPending ||
                  series.sources.some(
                    (s) =>
                      s.source.id === c.sourceId && s.locator === c.locator,
                  )
                }
                onClick={() => mutation.mutate({ kind: "source", id: c.id })}
              >
                Chọn trích dẫn
              </Button>
            </div>
          ))}
        </>
      ) : null}
      <ul className="text-xs text-mod-text-secondary">
        {series.publishChecklist.items
          .filter((i) => !i.ok)
          .map((i) => (
            <li key={i.key}>{checklistLabels[i.key] ?? i.key}</li>
          ))}
      </ul>
      <div className="flex gap-2">
        <Button
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ kind: "publish" })}
        >
          Phát hành series
        </Button>
        {series.status === "PUBLISHED" ? (
          <Button
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ kind: "hide" })}
          >
            Ẩn series
          </Button>
        ) : null}
      </div>
      {evidence.success ? (
        <details>
          <summary className="text-sm">
            Bằng chứng phát hành ngày{" "}
            {new Date(evidence.data.asOf).toLocaleString("vi-VN")}
          </summary>
          <p className="text-sm">
            {evidence.data.event.name} · phiên bản {evidence.data.event.version}
          </p>
          {evidence.data.sources.map((s, i) => (
            <p key={i} className="text-sm">
              {s.source.title} · {s.locator} · nguồn v{s.sourceVersion}
            </p>
          ))}
        </details>
      ) : null}
      {mutation.error ? (
        <p role="alert" className="text-sm text-mod-danger">
          {mutation.error.message}
        </p>
      ) : null}
    </section>
  );
}
function SeriesBranch({
  id,
  selected,
  onSelect,
  status,
}: {
  id: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  status: string;
}) {
  const q = usePodcastSeriesDetail(id);
  if (q.isPending)
    return <EmptyTableRow columns={5}>Đang tải nhánh…</EmptyTableRow>;
  if (q.error)
    return (
      <EmptyTableRow columns={5}>
        <span role="alert">{q.error.message}</span>
      </EmptyTableRow>
    );
  const episodes = q.data.episodes.filter(
    (e) => status === "all" || e.status === status,
  );
  return (
    <>
      <TableRow>
        <TableCell colSpan={5} className="bg-mod-canvas-accent/30 p-5">
          <SeriesEvidence
            key={q.data.updatedAt.toISOString()}
            series={q.data}
          />
        </TableCell>
      </TableRow>
      {episodes.map((e, i) => (
        <Fragment key={e.id}>
          <InteractiveTableRow
            expanded={selected === e.id}
            onActivate={() => onSelect(selected === e.id ? null : e.id)}
            className="mod-tree-child"
          >
            <TableHead scope="row" className={tableCell}>
              <ModeratorTreeNode
                kind="episode"
                depth={1}
                last={i === episodes.length - 1}
                name={e.title}
                open={selected === e.id}
                onClick={() => onSelect(selected === e.id ? null : e.id)}
              />
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
          </InteractiveTableRow>
          {selected === e.id ? (
            <TableRow>
              <TableCell colSpan={5} className="p-5">
                <EpisodeEditor id={e.id} />
              </TableCell>
            </TableRow>
          ) : null}
        </Fragment>
      ))}
      {!episodes.length ? (
        <EmptyTableRow columns={5}>
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
  const [creating, setCreating] = useState(initialKind !== undefined);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const series = usePodcastSeries(q);
  const rows = series.data?.pages.flatMap((p) => p.items) ?? [];
  if (creating)
    return (
      <PodcastCreation
        onBack={() => setCreating(false)}
        initialKind={initialKind}
        onSaved={(id) => {
          setCreating(false);
          setExpanded((old) => new Set(old).add(id));
          setQ("");
          setStatus("all");
        }}
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
              <Button
                className={primaryAction}
                onClick={() => setCreating(true)}
              >
                Tạo podcast
              </Button>
            }
          />
        }
      >
        <ModeratorTable
          embedded
          caption="Series và các tập podcast"
          columns={["Nội dung", "Số tập", "Kịch bản", "Âm thanh", "Trạng thái"]}
          minWidth={960}
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
              </InteractiveTableRow>
              {expanded.has(s.id) ? (
                <SeriesBranch
                  id={s.id}
                  selected={selected}
                  onSelect={setSelected}
                  status={status}
                />
              ) : null}
            </Fragment>
          ))}
          {series.isPending || series.error || !rows.length ? (
            <EmptyTableRow columns={5}>
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
              <TableCell colSpan={5}>
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
  );
}
