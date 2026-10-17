import { useState, type FormEvent, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  FormField,
  formField,
} from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import {
  primaryAction,
  secondaryAction,
} from "@/features/moderator/components/ModeratorTable";
import {
  useHistoricalEntities,
  useHistoricalEvent,
  useHistoricalPhases,
} from "@/features/historical-library/hooks/useHistoricalCatalog";
import { useIdempotentMutation } from "@/lib/useIdempotentMutation";
import { newIdempotencyKey } from "@/lib/idempotency";
import { notify } from "@/shared/lib/notifications";
import { usePodcastInvalidation } from "./hooks/usePodcastProduction";
import {
  NATIONAL_HISTORY_TOPIC_SLUG,
  podcastProductionService as api,
} from "./services/podcastProductionService";

interface SeriesCreationDialogProps {
  onBack: () => void;
  onSaved: (seriesId: string) => void;
}

export function SeriesCreationDialog({
  onBack,
  onSaved,
}: SeriesCreationDialogProps): ReactElement {
  const [eventId, setEventId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [savedId, setSavedId] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const phases = useHistoricalPhases(undefined, {}, true);
  const events = useHistoricalEntities(
    { q, historicalPhaseId: phaseId },
    Boolean(phaseId),
  );
  const event = useHistoricalEvent(eventId);
  const topics = useQuery({
    queryKey: ["podcast-production", "topics"],
    queryFn: api.topics,
  });
  const topic = topics.data?.items.find(
    (item) => item.slug === NATIONAL_HISTORY_TOPIC_SLUG,
  );
  const create = useIdempotentMutation(api.create);
  const invalidate = usePodcastInvalidation();

  const submit = async (submitEvent: FormEvent): Promise<void> => {
    submitEvent.preventDefault();
    setError("");
    if (!name.trim() || !description.trim() || !phaseId || !eventId) {
      setError(
        "Vui lòng nhập tên, mô tả, chọn giai đoạn và sự kiện lịch sử của series.",
      );
      return;
    }
    if (!topic) {
      setError("Chưa có chủ đề Lịch sử dân tộc trong hệ thống.");
      return;
    }
    setBusy(true);
    let persistedId = savedId;
    try {
      let id = savedId;
      if (!id) {
        id = (
          await create.mutateAsync({
            title: name.trim(),
            description: description.trim(),
            primaryHistoricalEventId: eventId,
            historicalPhaseId: phaseId,
            topicId: topic.id,
            startYear: event.data?.startYear,
            endYear: event.data?.endYear,
          })
        ).id;
        setSavedId(id);
        persistedId = id;
      } else {
        const current = await api.detail(id);
        await api.patch(id, {
          title: name.trim(),
          description: description.trim(),
          primaryHistoricalEventId: eventId,
          topicId: topic.id,
          baseUpdatedAt: current.updatedAt,
        });
      }
      const current = await api.detail(id);
      for (const citationId of chosen) {
        const citation = event.data?.citations.find(
          (item) => item.id === citationId,
        );
        if (
          citation &&
          !current.sources.some(
            (source) =>
              source.source.id === citation.sourceId &&
              source.locator === citation.locator,
          )
        )
          await api.addCitation(id, citationId, newIdempotencyKey());
      }
      await invalidate();
      notify.success({ title: "Đã tạo series." });
      onSaved(id);
    } catch (caught) {
      setError(
        `${persistedId ? "Bản nháp đã tạo. " : ""}${caught instanceof Error ? caught.message : "Không lưu được series."} Có thể thử lưu lại để hoàn tất.`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogContent className="flex h-auto max-h-[calc(100dvh-2rem)] max-w-2xl flex-col gap-0 overflow-hidden border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0">
      <DialogHeader className="shrink-0 border-b border-mod-border px-5 py-4 pr-16">
        <DialogTitle>Tạo series</DialogTitle>
        <DialogDescription className="text-mod-text-secondary">
          Tạo series từ một sự kiện lịch sử và chọn nguồn tư liệu sử dụng chung cho các tập.
        </DialogDescription>
      </DialogHeader>
      <form
        noValidate
        onSubmit={(submitEvent) => {
          void submit(submitEvent);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="mod-dialog-scroll-area flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-5">
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <FormField label="Tên series" htmlFor="series-name">
              <Input
                id="series-name"
                aria-label="Tên series"
                className={formField}
                value={name}
                disabled={busy}
                onChange={(changeEvent) => setName(changeEvent.target.value)}
              />
            </FormField>
            <FormField label="Chủ đề" htmlFor="series-topic">
              <Input
                id="series-topic"
                aria-label="Chủ đề"
                className={formField}
                value="Lịch sử dân tộc"
                disabled
                readOnly
              />
            </FormField>
          </div>
          <FormField label="Mô tả" htmlFor="series-description">
            <Textarea
              autoGrow
              id="series-description"
              aria-label="Mô tả series"
              className={`${formField} min-h-28`}
              value={description}
              disabled={busy}
              onChange={(changeEvent) => setDescription(changeEvent.target.value)}
            />
          </FormField>
          <FormField label="Giai đoạn" htmlFor="series-phase">
            <ModeratorSelect
              id="series-phase"
              label="Giai đoạn"
              value={phaseId}
              disabled={busy}
              onValueChange={(value) => {
                setPhaseId(value);
                setEventId("");
                setQ("");
                setChosen(new Set());
              }}
              options={
                phases.data?.pages.flatMap((page) =>
                  page.items.map((item) => ({
                    value: item.id,
                    label: `${item.name} · ${item.timeLabel}`,
                  })),
                ) ?? []
              }
              placeholder="Chọn giai đoạn trước"
            />
          </FormField>
          {phases.hasNextPage ? (
            <Button
              type="button"
              variant="ghost"
              className="self-start"
              disabled={busy}
              onClick={() => {
                void phases.fetchNextPage();
              }}
            >
              Tải thêm giai đoạn
            </Button>
          ) : null}
          <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <FormField label="Tìm sự kiện" htmlFor="series-event-search">
              <Input
                id="series-event-search"
                type="search"
                aria-label="Tìm sự kiện"
                className={formField}
                value={q}
                disabled={!phaseId || busy}
                onChange={(changeEvent) => setQ(changeEvent.target.value)}
              />
            </FormField>
            <FormField label="Sự kiện lịch sử" htmlFor="series-event">
              <ModeratorSelect
                id="series-event"
                label="Sự kiện lịch sử"
                value={eventId}
                disabled={!phaseId || busy}
                onValueChange={(value) => {
                  setEventId(value);
                  setChosen(new Set());
                }}
                options={
                  events.data?.pages.flatMap((page) =>
                    page.items.map((item) => ({
                      value: item.id,
                      label: [
                        item.name,
                      ]
                        .filter(Boolean)
                        .join(" / "),
                    })),
                  ) ?? []
                }
                placeholder={
                  phaseId ? "Chọn sự kiện lịch sử" : "Chọn giai đoạn trước"
                }
              />
            </FormField>
          </div>
          {phaseId && events.hasNextPage ? (
            <Button
              type="button"
              variant="ghost"
              className="self-start"
              disabled={busy}
              onClick={() => {
                void events.fetchNextPage();
              }}
            >
              Tải thêm sự kiện
            </Button>
          ) : null}
          {event.data ? (
            <section className="space-y-3 border-t border-mod-border pt-4">
              <div>
                <h2 className="font-semibold">Nguồn tư liệu của sự kiện</h2>
                <p className="mt-1 text-xs text-mod-text-secondary">
                  {event.data.readiness.ready
                    ? "Sự kiện đủ điều kiện làm cơ sở phát hành."
                    : "Có thể tạo nháp; sự kiện cần hoàn tất kiểm duyệt trước khi phát hành."}
                </p>
              </div>
              {event.data.citations.length ? (
                event.data.citations.map((citation) => (
                  <label key={citation.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={chosen.has(citation.id)}
                      onChange={(changeEvent) =>
                        setChosen((current) => {
                          const next = new Set(current);
                          if (changeEvent.target.checked) next.add(citation.id);
                          else next.delete(citation.id);
                          return next;
                        })
                      }
                    />
                    <span>
                      {citation.source.title} · {citation.locator || "Chưa có vị trí trích"}
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-mod-text-secondary">Sự kiện chưa có nguồn tư liệu.</p>
              )}
            </section>
          ) : null}
          {phases.error || events.error || event.error || topics.error ? (
            <p role="alert" className="text-sm text-mod-danger">
              {phases.error?.message ??
                events.error?.message ??
                event.error?.message ??
                topics.error?.message}
            </p>
          ) : null}
          {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
        </div>
        <footer className="flex shrink-0 justify-end gap-3 border-t border-mod-border bg-mod-surface px-5 py-3">
          <Button
            type="button"
            variant="outline"
            className={secondaryAction}
            disabled={busy}
            onClick={onBack}
          >
            Hủy
          </Button>
          <Button type="submit" className={primaryAction} disabled={busy}>
            {busy ? "Đang lưu…" : savedId ? "Hoàn tất bản nháp" : "Lưu bản nháp"}
          </Button>
        </footer>
      </form>
    </DialogContent>
  );
}
