import { useEffect, useState, type FormEvent } from "react";
import { CalendarPlus, FloppyDisk } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { DateTimePicker } from "@/shared/components/ui/date-picker";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
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
  formId = "release-schedule-form",
  showSubmitAction = true,
}: {
  moderators: ReleaseModeratorOption[];
  onSubmit: (input: ReleaseScheduleDraft) => Promise<unknown> | unknown;
  isSubmitting?: boolean;
  mode?: "create" | "edit";
  initialValues?: ReleaseScheduleDraft;
  initialValuesKey?: string;
  formId?: string;
  showSubmitAction?: boolean;
}) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [productionDeadline, setProductionDeadline] = useState(initialValues?.productionDeadline ?? "");
  const [scheduledAt, setScheduledAt] = useState(initialValues?.scheduledAt ?? "");
  const [moderatorId, setModeratorId] = useState(initialValues?.moderatorId ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initialValues?.title ?? "");
    setProductionDeadline(initialValues?.productionDeadline ?? "");
    setScheduledAt(initialValues?.scheduledAt ?? "");
    setModeratorId(initialValues?.moderatorId ?? "");
    setError(null);
    // The key deliberately controls when a new create/edit session resets local values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValuesKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !productionDeadline || !scheduledAt || !moderatorId) {
      setError("Điền đủ tên kế hoạch, hai mốc thời gian và chọn một Moderator phụ trách.");
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
      moderatorId,
    });
  }

  return (
    <form id={formId} onSubmit={submit} className="flex flex-col gap-5" aria-label={mode === "edit" ? "Cập nhật lịch phát hành" : "Tạo lịch phát hành"}>
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
          <DateTimePicker
            id="production-deadline"
            value={productionDeadline}
            onChange={setProductionDeadline}
            ariaLabel="Chọn hạn hoàn thành sản xuất"
            placeholder="Chọn ngày hoàn thành"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="scheduled-at">Thời gian phát hành</Label>
          <DateTimePicker
            id="scheduled-at"
            value={scheduledAt}
            onChange={setScheduledAt}
            ariaLabel="Chọn ngày phát hành"
            placeholder="Chọn ngày phát hành"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="release-moderator">Moderator phụ trách</Label>
        {moderators.length ? (
          <Select value={moderatorId} onValueChange={setModeratorId}>
            <SelectTrigger
              id="release-moderator"
              aria-label="Moderator phụ trách"
              className="h-12 border-mod-border bg-mod-canvas"
            >
              <SelectValue placeholder="Chọn Moderator phụ trách" />
            </SelectTrigger>
            <SelectContent>
              {moderators.map((moderator) => (
                <SelectItem key={moderator.id} value={moderator.id}>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{moderator.name}</span>
                    <span className="truncate text-xs text-mod-text-secondary">{moderator.email}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="rounded-[12px] bg-mod-canvas p-4 text-sm text-mod-text-secondary">
            Chưa có Moderator đang hoạt động để phân công.
          </p>
        )}
      </div>
      {error ? <p role="alert" className="text-sm font-medium text-vermilion">{error}</p> : null}
      {showSubmitAction ? (
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
      ) : null}
    </form>
  );
}
