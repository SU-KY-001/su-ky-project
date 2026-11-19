import type { ReactElement } from "react";
import { OUTLINE_MAX_WORDS, OUTLINE_MIN_WORDS, OUTLINE_TOPIC_MAX, type Angle } from "@repo/shared";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/lib/utils";
import { clampWords, MINUTE_CHIPS, minutesLimits, WORD_STEP } from "../../compose/outlineState";
import { AngleList } from "./AngleList";

export interface TopicForm {
  topic: string;
  angleId: string;
  minutes: number;
  words: number;
}

interface Props {
  form: TopicForm;
  wordsPerMinute: number;
  angles: { items: Angle[]; loading: boolean; error: string | null };
  onChange: (form: TopicForm) => void;
  words: (minutes: number) => number;
}

export function DraftTopicStep({ form, wordsPerMinute, angles, onChange, words }: Props): ReactElement {
  const limits = minutesLimits(wordsPerMinute);
  const setMinutes = (minutes: number): void => {
    const next = Math.min(limits.max, Math.max(limits.min, Math.round(minutes) || limits.min));
    onChange({ ...form, minutes: next, words: words(next) });
  };
  return (
    <div className="space-y-5 px-5 py-4">
      <label className="block space-y-1 text-sm font-bold text-mod-text">
        Chủ đề của tập
        <span className="block text-xs font-normal text-mod-text-secondary">Một câu. AI dùng câu này để định hướng dàn ý.</span>
        <Input value={form.topic} maxLength={OUTLINE_TOPIC_MAX} placeholder="Vì sao Lý Thái Tổ dời đô từ Hoa Lư ra Thăng Long" onChange={(event) => onChange({ ...form, topic: event.target.value })} />
      </label>

      <div className="space-y-1">
        <p className="text-sm font-bold text-mod-text">Góc kể</p>
        <AngleList angles={angles.items} loading={angles.loading} error={angles.error} value={form.angleId} onChange={(angleId) => onChange({ ...form, angleId })} />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-mod-text">Thời lượng mục tiêu</legend>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="number" aria-label="Số phút" className="w-24" min={limits.min} max={limits.max} value={form.minutes} onChange={(event) => setMinutes(Number(event.target.value))} />
          <span className="text-sm text-mod-text-secondary">phút</span>
          {MINUTE_CHIPS.filter((chip) => chip >= limits.min && chip <= limits.max).map((chip) => (
            <button key={chip} type="button" className={cn("rounded-full border px-3 py-1 text-xs font-bold", form.minutes === chip ? "border-mod-primary bg-mod-primary/10 text-mod-primary" : "border-mod-border text-mod-text-secondary")} onClick={() => setMinutes(chip)}>{chip}</button>
          ))}
          <span className="text-sm text-mod-text-secondary">≈ {form.words.toLocaleString("vi-VN")} từ</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-mod-text-secondary">
          Hoặc đặt trực tiếp số từ
          <Input type="number" aria-label="Số từ" className="w-28" min={OUTLINE_MIN_WORDS} max={OUTLINE_MAX_WORDS} step={WORD_STEP} value={form.words} onChange={(event) => onChange({ ...form, words: clampWords(Number(event.target.value)) })} />
        </label>
        <p className="text-xs text-mod-text-secondary">Quy đổi theo {wordsPerMinute} từ/phút, cùng cấu hình với ước tính thời lượng kịch bản.</p>
      </fieldset>
      <p className="text-xs text-mod-text-secondary">AI có thể dùng nguồn của series làm ngữ cảnh nền; series chưa có nguồn vẫn soạn được.</p>
    </div>
  );
}
