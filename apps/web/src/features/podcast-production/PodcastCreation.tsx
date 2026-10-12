import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CreationPage,
  FormField,
  formField,
} from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { useIdempotentMutation } from "@/lib/useIdempotentMutation";
import { newIdempotencyKey } from "@/lib/idempotency";
import { notify } from "@/shared/lib/notifications";
import {
  useHistoricalEntities,
  useHistoricalEvent,
} from "@/features/historical-library/hooks/useHistoricalCatalog";
import {
  usePodcastSeries,
  usePodcastSeriesDetail,
  usePodcastInvalidation,
} from "./hooks/usePodcastProduction";
import { podcastProductionService as api } from "./services/podcastProductionService";
export function PodcastCreation({
  onBack,
  onSaved,
  initialKind = "series",
}: {
  onBack: () => void;
  onSaved: (seriesId: string) => void;
  initialKind?: "series" | "episode";
}) {
  const [kind, setKind] = useState(initialKind);
  const [seriesId, setSeriesId] = useState("");
  const [eventId, setEventId] = useState("");
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [script, setScript] = useState("");
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [topicId, setTopicId] = useState("");
  const [savedId, setSavedId] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const series = usePodcastSeries();
  const selected = usePodcastSeriesDetail(seriesId);
  const effectiveEvent =
    kind === "episode"
      ? (selected.data?.primaryHistoricalEventId ?? "")
      : eventId;
  const event = useHistoricalEvent(effectiveEvent);
  const events = useHistoricalEntities({ q });
  const topics = useQuery({
    queryKey: ["podcast-production", "topics"],
    queryFn: api.topics,
  });
  const invalidate = usePodcastInvalidation();
  const create = useIdempotentMutation(api.create);
  const append = useIdempotentMutation(
    (input: { id: string; title: string }, key) =>
      api.append(input.id, input.title, key),
  );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !description.trim() || !effectiveEvent) {
      setError("Vui lòng nhập tên, mô tả và chọn sự kiện lịch sử của series.");
      return;
    }
    setBusy(true);
    let persistedId = savedId;
    try {
      let id = savedId;
      if (!id) {
        if (kind === "series")
          id = (
            await create.mutateAsync({
              title: name.trim(),
              description: description.trim(),
              primaryHistoricalEventId: effectiveEvent,
              topicId: topicId || null,
            })
          ).id;
        else
          id = (await append.mutateAsync({ id: seriesId, title: name.trim() }))
            .id;
        setSavedId(id);
        persistedId = id;
      }
      if (kind === "episode") {
        await api.patchEpisode(id, { description });
        if (script.trim()) await api.script(id, { scriptContent: script });
      } else {
        const current = await api.detail(id);
        if (savedId)
          await api.patch(id, {
            description: description.trim(),
            topicId: topicId || null,
            baseUpdatedAt: current.updatedAt,
          });
        for (const citationId of chosen) {
          const citation = event.data?.citations.find(
            (c) => c.id === citationId,
          );
          if (
            citation &&
            !current.sources.some(
              (s) =>
                s.source.id === citation.sourceId &&
                s.locator === citation.locator,
            )
          )
            await api.addCitation(id, citationId, newIdempotencyKey());
        }
      }
      await invalidate();
      notify.success({
        title: `Đã tạo bản nháp ${kind === "series" ? "series" : "tập podcast"} “${name.trim()}”.`,
        description: "Đã lưu vào hệ thống.",
      });
      onSaved(kind === "series" ? id : seriesId);
    } catch (e) {
      setError(
        `${persistedId ? "Bản nháp đã tạo. " : ""}${e instanceof Error ? e.message : "Không lưu được podcast."} Có thể thử lưu lại để hoàn tất.`,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <CreationPage title="Tạo podcast" onBack={onBack}>
      <form
        noValidate
        onSubmit={(e) => {
          void submit(e);
        }}
        className="space-y-5"
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <FormField label="Loại podcast" htmlFor="podcast-kind">
              <ModeratorSelect
                id="podcast-kind"
                label="Loại podcast"
                disabled={Boolean(savedId) || busy}
                value={kind}
                onValueChange={(v) => {
                  if (v === "series" || v === "episode") setKind(v);
                }}
                options={[
                  { value: "series", label: "Series" },
                  { value: "episode", label: "Tập podcast" },
                ]}
                placeholder="Chọn loại"
              />
            </FormField>
            {kind === "episode" ? (
              <FormField label="Series" htmlFor="podcast-series">
                <ModeratorSelect
                  id="podcast-series"
                  label="Series"
                  value={seriesId}
                  disabled={Boolean(savedId) || busy}
                  onValueChange={setSeriesId}
                  options={
                    series.data?.pages.flatMap((p) =>
                      p.items.map((s) => ({ value: s.id, label: s.title })),
                    ) ?? []
                  }
                  placeholder="Chọn series"
                />
                {series.hasNextPage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      void series.fetchNextPage();
                    }}
                  >
                    Tải thêm series
                  </Button>
                ) : null}
              </FormField>
            ) : null}
            {kind === "series" ? (
              <label className="block text-sm">
                Tìm sự kiện
                <input
                  aria-label="Tìm sự kiện"
                  className={formField}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
            ) : null}
            <FormField label="Sự kiện lịch sử" htmlFor="podcast-event">
              <ModeratorSelect
                id="podcast-event"
                label="Sự kiện lịch sử"
                value={effectiveEvent}
                disabled={kind === "episode" || Boolean(savedId) || busy}
                onValueChange={(v) => {
                  setEventId(v);
                  setChosen(new Set());
                }}
                options={[
                  ...(events.data?.pages.flatMap((p) =>
                    p.items.map((e) => ({
                      value: e.id,
                      label: [
                        e.historicalPhase?.period?.name,
                        e.historicalPhase?.name,
                        e.name,
                      ]
                        .filter(Boolean)
                        .join(" / "),
                    })),
                  ) ?? []),
                  ...(event.data &&
                  !events.data?.pages.some((p) =>
                    p.items.some((e) => e.id === event.data.id),
                  )
                    ? [{ value: event.data.id, label: event.data.name }]
                    : []),
                ]}
                placeholder="Chọn sự kiện lịch sử"
              />
            </FormField>
            {kind === "series" && events.hasNextPage ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  void events.fetchNextPage();
                }}
              >
                Tải thêm sự kiện
              </Button>
            ) : null}
            {kind === "series" ? (
              <FormField label="Chủ đề" htmlFor="podcast-topic">
                <ModeratorSelect
                  id="podcast-topic"
                  label="Chủ đề"
                  value={topicId}
                  onValueChange={setTopicId}
                  options={
                    topics.data?.items.map((t) => ({
                      value: t.id,
                      label: t.name,
                    })) ?? []
                  }
                  placeholder="Chọn chủ đề trước khi phát hành"
                />
              </FormField>
            ) : null}
          </div>
          <div className="space-y-4">
            <FormField
              label={kind === "series" ? "Tên series" : "Tên tập podcast"}
              htmlFor="podcast-name"
            >
              <Input
                id="podcast-name"
                aria-label="Tên podcast"
                className={formField}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={Boolean(savedId) || busy}
              />
            </FormField>
            <FormField label="Mô tả" htmlFor="podcast-description">
              <Textarea
                id="podcast-description"
                aria-label="Mô tả podcast"
                className={formField}
                value={description}
                disabled={busy}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>
            {kind === "episode" ? (
              <FormField label="Kịch bản" htmlFor="podcast-script">
                <Textarea
                  id="podcast-script"
                  aria-label="Kịch bản"
                  className={formField + " min-h-64"}
                  value={script}
                  disabled={busy}
                  onChange={(e) => setScript(e.target.value)}
                />
              </FormField>
            ) : null}
          </div>
        </div>
        {event.data ? (
          <section className="space-y-2 border-t border-mod-border pt-4">
            <h2 className="font-semibold">Trích dẫn từ sự kiện</h2>
            <p className="text-xs text-mod-text-secondary">
              {event.data.readiness.ready
                ? "Sự kiện đủ điều kiện làm cơ sở phát hành."
                : "Có thể tạo nháp; sự kiện cần hoàn tất kiểm duyệt trước khi phát hành."}
            </p>
            {kind === "series" ? (
              event.data.citations.map((c) => (
                <label key={c.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={chosen.has(c.id)}
                    onChange={(e) =>
                      setChosen((old) => {
                        const next = new Set(old);
                        if (e.target.checked) next.add(c.id);
                        else next.delete(c.id);
                        return next;
                      })
                    }
                  />
                  <span>
                    {c.source.title} · {c.locator || "Chưa có vị trí trích"}
                  </span>
                </label>
              ))
            ) : (
              <p className="text-sm">Tập sử dụng nguồn đã chọn trong series.</p>
            )}
          </section>
        ) : null}
        {events.error || series.error || event.error ? (
          <p role="alert">
            {events.error?.message ??
              series.error?.message ??
              event.error?.message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-mod-danger">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onBack}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={busy}>
            {busy
              ? "Đang lưu…"
              : savedId
                ? "Hoàn tất bản nháp"
                : "Lưu bản nháp"}
          </Button>
        </div>
      </form>
    </CreationPage>
  );
}
