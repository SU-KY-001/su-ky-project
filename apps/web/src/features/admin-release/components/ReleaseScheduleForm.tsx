import { useEffect, useState, type FormEvent } from "react";
import { CalendarPlus, Check, FloppyDisk } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import type { ReleaseScheduleDraft } from "../services/adminReleaseService";

export interface ReleaseModeratorOption {
  id: string;
  name: string;
  email: string;
}

export function ReleaseScheduleForm({
  moderators,
  onSubmit,
  isSubmitting = false,
  mode = "create",
  initialValues,
  initialValuesKey = mode,
}: {
  moderators: ReleaseModeratorOption[];
  onSubmit: (input: ReleaseScheduleDraft) => Promise<unknown> | unknown;
  isSubmitting?: boolean;
  mode?: "create" | "edit";
  initialValues?: ReleaseScheduleDraft;
  initialValuesKey?: string;
}) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [productionDeadline, setProductionDeadline] = useState(initialValues?.productionDeadline ?? "");
  const [scheduledAt, setScheduledAt] = useState(initialValues?.scheduledAt ?? "");
  const [moderatorIds, setModeratorIds] = useState<string[]>(initialValues?.moderatorIds ?? []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initialValues?.title ?? "");
    setProductionDeadline(initialValues?.productionDeadline ?? "");
    setScheduledAt(initialValues?.scheduledAt ?? "");
    setModeratorIds(initialValues?.moderatorIds ?? []);
    setError(null);
    // The key deliberately controls when a new create/edit session resets local values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValuesKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !productionDeadline || !scheduledAt || !moderatorIds.length) {
      setError("Điền đủ tên kế hoạch, hai mốc thời gian và ít nhất một Moderator.");
      return;
    }
    if (new Date(productionDeadline) >= new Date(scheduledAt)) {
      setError("Hạn hoàn thành phải trước thời gian phát hành.");
      return;
    }
    setError(null);
    await onSubmit({
      title: title.trim(),
      episodeId: initialValues?.episodeId ?? null,
      productionDeadline: new Date(productionDeadline).toISOString(),
      scheduledAt: new Date(scheduledAt).toISOString(),
      moderatorIds,
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" aria-label={mode === "edit" ? "Cập nhật lịch phát hành" : "Tạo lịch phát hành"}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2 lg:col-span-2">
          <Label htmlFor="release-title">Tên kế hoạch hoặc podcast</Label>
          <Input
            id="release-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ví dụ: Dấu chân Trường Sơn"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="production-deadline">Hạn hoàn thành sản xuất</Label>
          <Input
            id="production-deadline"
            type="datetime-local"
            value={productionDeadline}
            onChange={(event) => setProductionDeadline(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="scheduled-at">Thời gian phát hành</Label>
          <Input
            id="scheduled-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            required
          />
        </div>
      </div>
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2 text-sm font-semibold text-mod-text">Moderator phụ trách</legend>
        {moderators.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {moderators.map((moderator) => {
              const checked = moderatorIds.includes(moderator.id);
              return (
                <label
                  key={moderator.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-[12px] border p-3 transition-colors ${
                    checked
                      ? "border-mod-primary/45 bg-mod-primary/5"
                      : "border-mod-border bg-mod-surface hover:bg-mod-canvas"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setModeratorIds((current) =>
                        checked
                          ? current.filter((id) => id !== moderator.id)
                          : [...current, moderator.id],
                      )
                    }
                    className="sr-only"
                  />
                  <span className={`grid size-5 place-items-center rounded border ${checked ? "border-mod-primary bg-mod-primary text-white" : "border-mod-border"}`}>
                    {checked ? <Check size={13} weight="bold" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-mod-text">{moderator.name}</span>
                    <span className="block truncate text-xs text-mod-text-secondary">{moderator.email}</span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="rounded-[12px] bg-mod-canvas p-4 text-sm text-mod-text-secondary">
            Chưa có Moderator đang hoạt động để phân công.
          </p>
        )}
      </fieldset>
      {error ? <p role="alert" className="text-sm font-medium text-vermilion">{error}</p> : null}
      <Button
        type="submit"
        disabled={isSubmitting || !moderators.length}
        className="w-fit gap-2 bg-mod-primary text-white hover:bg-mod-primary/90"
      >
        {mode === "edit" ? <FloppyDisk size={18} /> : <CalendarPlus size={18} />}
        {isSubmitting
          ? mode === "edit" ? "Đang lưu" : "Đang tạo lịch"
          : mode === "edit" ? "Lưu thay đổi" : "Tạo lịch phát hành"}
      </Button>
    </form>
  );
}
