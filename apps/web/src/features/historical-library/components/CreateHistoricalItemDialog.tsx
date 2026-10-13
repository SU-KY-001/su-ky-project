import { useState, type FormEvent } from "react";
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

export type HistoricalDraftKind = "period" | "stage" | "event";

export interface HistoricalDraftInput {
  name: string;
  timeLabel: string;
  summary: string;
}

const kindCopy = {
  period: {
    title: "Tạo thời kỳ",
    noun: "thời kỳ",
    placeholder: "Ví dụ: Quân chủ độc lập",
  },
  stage: {
    title: "Thêm giai đoạn",
    noun: "giai đoạn",
    placeholder: "Ví dụ: Buổi đầu độc lập",
  },
  event: {
    title: "Thêm sự kiện",
    noun: "sự kiện",
    placeholder: "Ví dụ: Chiến thắng Bạch Đằng",
  },
} as const;

export function CreateHistoricalItemDialog({
  open,
  kind,
  parentLabel,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  kind: HistoricalDraftKind;
  parentLabel?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: HistoricalDraftInput) => void;
}) {
  const [name, setName] = useState("");
  const [timeLabel, setTimeLabel] = useState("");
  const [summary, setSummary] = useState("");
  const copy = kindCopy[kind];

  const resetForm = () => {
    setName("");
    setTimeLabel("");
    setSummary("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      timeLabel: timeLabel.trim(),
      summary: summary.trim(),
    });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[520px] border-mod-border bg-mod-surface text-mod-text shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-mod-text">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="text-mod-text-secondary">
            {parentLabel
              ? `Bản nháp sẽ được tạo bên trong “${parentLabel}”.`
              : "Bản nháp sẽ được thêm vào thư viện trong phiên làm việc hiện tại."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-mod-text">
            Tên {copy.noun}
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={copy.placeholder}
              required
              autoFocus
              className="h-11 border-mod-border bg-mod-surface px-3 text-sm text-mod-text shadow-none placeholder:text-mod-text-low focus-visible:ring-0"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-bold text-mod-text">
            Mốc thời gian
            <Input
              value={timeLabel}
              onChange={(event) => setTimeLabel(event.target.value)}
              placeholder="Ví dụ: 938 – 1009 hoặc 02/09/1945"
              required
              className="h-11 border-mod-border bg-mod-surface px-3 text-sm text-mod-text shadow-none placeholder:text-mod-text-low focus-visible:ring-0"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-bold text-mod-text">
            Mô tả ngắn
            <Textarea
              autoGrow
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder={`Tóm tắt vai trò và phạm vi của ${copy.noun} này`}
              required
              className="min-h-28 w-full rounded-lg border border-mod-border bg-mod-surface px-3 py-2.5 text-sm leading-6 text-mod-text outline-none placeholder:text-mod-text-low focus-visible:ring-0"
            />
          </label>

          <div className="mt-1 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              className="min-h-11 px-4 text-mod-text-secondary hover:bg-mod-canvas-accent hover:text-mod-text"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="min-h-11 bg-vermilion px-5 font-bold text-white hover:bg-vermilion-dark"
            >
              Lưu bản nháp
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
