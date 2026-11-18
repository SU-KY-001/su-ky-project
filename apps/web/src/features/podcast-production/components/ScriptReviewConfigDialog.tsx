import { useEffect, useState, type ReactElement } from "react";
import { ArrowRight, Info, Play } from "lucide-react";
import { AI_CHECK_MAX_NOTE_CHARS, AI_CHECK_MAX_SOURCES } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/lib/utils";
import { aiCheckService } from "../aiCheck/aiCheckService";

export type ReviewScope = "ALL" | "SELECTION";

const STEP_TITLES = ["Rà phần nào?", "Nguồn đối chiếu", "Ghi chú cho AI"] as const;
type Step = 0 | 1 | 2;

/** Wait after the last keystroke before querying the source library. */
const SOURCE_SEARCH_DEBOUNCE_MS = 250;

interface SourceOption {
  id: string;
  title: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Number of blocks the whole script has right now. */
  blockCount: number;
  /** 1-based number of the block (or "2-3" range) the caret was in when the dialog opened; null when none. */
  selectionLabel: string | null;
  initialScope?: ReviewScope;
  onRun: (scope: ReviewScope, sourceIds: string[], note: string) => void;
}

function Dots({ step }: { step: Step }): ReactElement {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {STEP_TITLES.map((title, index) => (
        <span key={title} className={cn("size-2 rounded-full", index === step ? "bg-mod-primary" : "bg-mod-border")} />
      ))}
    </div>
  );
}

function SourcePicker({ picked, onToggle }: { picked: string[]; onToggle: (sourceId: string) => void }): ReactElement {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SourceOption[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    // Debounced so typing in the search box does not fire one request per key.
    const timer = setTimeout(() => {
      aiCheckService
        .sources(query.trim())
        .then((items) => {
          if (!live) return;
          setOptions(items.map(({ id, title }) => ({ id, title })));
          setFailed(false);
        })
        .catch(() => {
          if (!live) return;
          setOptions([]);
          setFailed(true);
        });
    }, SOURCE_SEARCH_DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query]);
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Nguồn để AI đối chiếu</legend>
      <Input value={query} placeholder="Tìm nguồn theo tên" aria-label="Tìm nguồn" onChange={(event) => setQuery(event.target.value)} />
      {failed ? <p role="alert" className="text-xs text-mod-attention">Không tải được danh sách nguồn.</p> : null}
      {options.length === 0 && !failed ? <p className="text-xs text-mod-text-secondary">Không có nguồn nào khớp.</p> : null}
      <ul className="max-h-56 space-y-1 overflow-y-auto">
        {options.map((option) => {
          const rank = picked.indexOf(option.id);
          const full = rank < 0 && picked.length >= AI_CHECK_MAX_SOURCES;
          return (
            <li key={option.id}>
              <label className={cn("flex items-start gap-3 rounded-lg border border-mod-border p-2.5 text-sm", full && "opacity-50")}>
                <input type="checkbox" className="mt-1" checked={rank >= 0} disabled={full} onChange={() => onToggle(option.id)} />
                <span className="min-w-0">
                  <span className="block text-mod-text">{option.title}</span>
                  <span className="text-xs text-mod-text-secondary">
                    {rank >= 0 ? `S${rank + 1} trong lượt rà này` : "Chưa chọn"}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function Form({ blockCount, selectionLabel, initialScope, onRun, onClose }: Omit<Props, "open" | "onOpenChange"> & { onClose: () => void }): ReactElement {
  const hasSelection = selectionLabel !== null;
  const [step, setStep] = useState<Step>(0);
  const [scope, setScope] = useState<ReviewScope>(hasSelection ? (initialScope ?? "ALL") : "ALL");
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const toggleSource = (sourceId: string): void =>
    setPicked((old) =>
      old.includes(sourceId) ? old.filter((id) => id !== sourceId) : old.length >= AI_CHECK_MAX_SOURCES ? old : [...old, sourceId],
    );
  return (
    <>
      <DialogHeader className="flex-row items-start justify-between border-b border-mod-border px-5 py-4 pr-14">
        <div>
          <DialogDescription className="text-xs text-mod-text-secondary">AI rà kịch bản</DialogDescription>
          <DialogTitle>{STEP_TITLES[step]}</DialogTitle>
        </div>
        <Dots step={step} />
      </DialogHeader>
      {step === 0 ? (
        <>
          <fieldset className="space-y-2 px-5 py-4">
            <legend className="sr-only">Phạm vi rà</legend>
            <label className="flex items-start gap-3 rounded-lg border border-mod-border p-3 text-sm">
              <input type="radio" name="scope" className="mt-1" checked={scope === "ALL"} onChange={() => setScope("ALL")} />
              <span>
                <b className="block text-mod-text">Cả kịch bản</b>
                <span className="text-xs text-mod-text-secondary">{blockCount} đoạn.</span>
              </span>
            </label>
            <label className={cn("flex items-start gap-3 rounded-lg border border-mod-border p-3 text-sm", !hasSelection && "opacity-50")}>
              <input type="radio" name="scope" className="mt-1" checked={scope === "SELECTION"} disabled={!hasSelection} onChange={() => setScope("SELECTION")} />
              <span>
                <b className="block text-mod-text">Đoạn đang chọn</b>
                <span className="text-xs text-mod-text-secondary">
                  {hasSelection ? `Đoạn ${selectionLabel} đang chọn.` : "Bấm vào một đoạn trong editor trước để dùng lựa chọn này."}
                </span>
              </span>
            </label>
          </fieldset>
          <DialogFooter className="border-t border-mod-border px-5 py-3">
            <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
            <Button type="button" onClick={() => setStep(1)}>Tiếp <ArrowRight size={16} aria-hidden="true" /></Button>
          </DialogFooter>
        </>
      ) : step === 1 ? (
        <>
          <div className="space-y-3 px-5 py-4">
            <p className="text-sm text-mod-text-secondary">
              Chọn tối đa {AI_CHECK_MAX_SOURCES} nguồn trong thư viện để AI đối chiếu. Bỏ trống thì AI dùng nguồn gắn với series, nếu có; không có nguồn nào thì lượt rà không đối chiếu được sự kiện.
            </p>
            <SourcePicker picked={picked} onToggle={toggleSource} />
            <p className="text-xs text-mod-text-secondary">Đã chọn {picked.length}/{AI_CHECK_MAX_SOURCES} nguồn.</p>
          </div>
          <DialogFooter className="border-t border-mod-border px-5 py-3">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>Quay lại</Button>
            <Button type="button" onClick={() => setStep(2)}>Tiếp <ArrowRight size={16} aria-hidden="true" /></Button>
          </DialogFooter>
        </>
      ) : (
        <>
          <div className="space-y-3 px-5 py-4">
            <label className="block space-y-1 text-sm font-bold text-mod-text">
              Ghi chú cho AI
              <span className="block text-xs font-normal text-mod-text-secondary">Tùy chọn. AI đọc thêm ghi chú này khi rà.</span>
              <Textarea value={note} maxLength={AI_CHECK_MAX_NOTE_CHARS} rows={3} placeholder="Ví dụ: bỏ qua đoạn mở đầu vì đó là lời dẫn" onChange={(event) => setNote(event.target.value)} />
            </label>
            <p className="flex items-start gap-2 rounded-lg bg-mod-canvas-accent p-3 text-xs text-mod-text-secondary">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              Nội dung kịch bản được gửi tới nhà cung cấp AI. AI không ghi gì vào kịch bản.
            </p>
          </div>
          <DialogFooter className="border-t border-mod-border px-5 py-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>Quay lại</Button>
            <Button type="button" onClick={() => onRun(scope, picked, note.trim())}><Play size={16} aria-hidden="true" /> Chạy</Button>
          </DialogFooter>
        </>
      )}
    </>
  );
}

export function ScriptReviewConfigDialog({ open, onOpenChange, ...form }: Props): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0">
        {open ? <Form {...form} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
