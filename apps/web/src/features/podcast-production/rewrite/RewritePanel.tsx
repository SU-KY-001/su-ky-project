import { useEffect, useRef, useState, type ReactElement, type RefObject } from "react";
import { ArrowDown, Info, Sparkles } from "lucide-react";
import { hashBlockText, REWRITE_DEFAULT_VARIANTS, REWRITE_INSTRUCTION_MAX, REWRITE_MAX_BLOCKS, REWRITE_MAX_VARIANTS, type RewriteResponse } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { AiRunStatus } from "../ai/AiRunStatus";
import { useAiRunLog } from "../ai/aiRunLog";
import { AI_RUN_TEXT } from "../ai/aiRunMessages";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SelectionRange } from "../aiCheck/editorBlocks";
import { novelHint } from "../aiCheck/novelHint";
import { wordDiff } from "../aiCheck/wordDiff";
import type { RichScriptEditorHandle } from "../components/RichScriptEditor";
import { composeService } from "../compose/composeService";
import { describeComposeError, isAbort } from "../compose/composeMessages";
import { sentenceCount } from "./sentenceRange";

const STEP_TITLES = ["Đoạn bạn chọn", "Chọn bản viết lại"] as const;
const QUICK_INSTRUCTIONS = [
  { label: "Ngắn hơn", text: "Viết ngắn hơn, giữ đủ dữ kiện." },
  { label: "Dễ nghe hơn", text: "Viết dễ nghe hơn khi đọc thành tiếng." },
  { label: "Tự nhiên hơn", text: "Viết tự nhiên hơn, như người kể chuyện." },
] as const;
const PERCENT = 100;

type Variant = RewriteResponse["variants"][number];

interface Props {
  range: SelectionRange;
  onClose: () => void;
  editorRef: RefObject<RichScriptEditorHandle | null>;
  episodeId: string | null;
  ensureEpisode: () => Promise<string>;
}

const clampCount = (value: number): number => (Number.isFinite(value) && value >= 1 ? Math.min(REWRITE_MAX_VARIANTS, Math.round(value)) : REWRITE_DEFAULT_VARIANTS);

function Diff({ before, after }: { before: string; after: string }): ReactElement {
  return (
    <p className="text-sm leading-6">
      {wordDiff(before, after).map((part, index) =>
        part.kind === "same" ? <span key={index}>{part.text}</span> : part.kind === "add" ? <ins key={index} className="bg-mod-success/15 no-underline">{part.text}</ins> : <del key={index} className="bg-mod-danger/15">{part.text}</del>,
      )}
    </p>
  );
}

export function RewritePanel({ range, onClose, editorRef, episodeId, ensureEpisode }: Props): ReactElement {
  const [step, setStep] = useState<0 | 1>(0);
  const [instruction, setInstruction] = useState("");
  const [count, setCount] = useState(REWRITE_DEFAULT_VARIANTS);
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const runLog = useAiRunLog();

  useEffect(() => () => controller.current?.abort(), []);

  const original = range.blocks.map((block) => block.fragment).join(" ");
  const sentences = sentenceCount(original);

  const cancelPending = (): void => {
    controller.current?.abort();
    controller.current = null;
  };

  const run = async (): Promise<void> => {
    cancelPending();
    const current = new AbortController();
    controller.current = current;
    setStep(1);
    setLoading(true);
    setError("");
    runLog.begin(AI_RUN_TEXT.rewriteStart(range.blocks.length));
    setVariants([]);
    setPicked(null);
    try {
      const id = episodeId ?? (await ensureEpisode());
      const response = await composeService.rewrite(
        id,
        {
          blocks: range.blocks.map((block) => ({ ref: block.ref, text: block.fragment, hash: hashBlockText(block.fragment) })),
          contextBefore: range.contextBefore || undefined,
          contextAfter: range.contextAfter || undefined,
          instruction: instruction.trim() || undefined,
          count,
        },
        current.signal,
      );
      setVariants(response.variants);
      runLog.push("done", AI_RUN_TEXT.rewriteDone(response.variants.length));
    } catch (caught) {
      if (isAbort(caught)) return;
      const message = describeComposeError(caught, "Không viết lại được.");
      setError(message);
      runLog.push("error", message);
    } finally {
      if (controller.current === current) setLoading(false);
    }
  };

  const chosen = variants.find((variant) => variant.id === picked) ?? null;
  const commit = (mode: "replace" | "below"): void => {
    if (!chosen) return;
    const handle = editorRef.current;
    const result = mode === "replace" ? handle?.replaceRange(range, chosen.paragraphs) : handle?.insertAfterRange(range, chosen.paragraphs);
    if (result?.ok) return onClose();
    setError(result?.reason === "TOO_LONG" ? "Không đủ chỗ trong kịch bản. Chưa ghi gì." : "Đoạn đã đổi, chọn lại rồi viết lại. Chưa ghi gì vào kịch bản.");
  };

  return (
    <>
      <header className="flex items-start justify-between border-b border-mod-border px-5 py-3">
        <div>
          <p className="text-xs text-mod-text-secondary">Viết lại đoạn đang chọn</p>
          <h3 className="font-bold text-mod-text">{STEP_TITLES[step]}</h3>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">{STEP_TITLES.map((title, index) => <span key={title} className={cn("size-2 rounded-full", index === step ? "bg-mod-primary" : "bg-mod-border")} />)}</div>
      </header>

      {step === 0 ? (
        <>
          <div className="space-y-4 px-5 py-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-mod-text">Phần được viết lại</p>
              <p className="max-h-40 overflow-y-auto rounded-lg border border-mod-border bg-mod-canvas-accent p-3 text-sm leading-6 text-mod-text">{original}</p>
              <p className="text-xs text-mod-text-secondary">
                Bạn chọn {range.selectedChars.toLocaleString("vi-VN")} ký tự. Phạm vi mở rộng thành {sentences} câu, {original.length.toLocaleString("vi-VN")} ký tự.
                {range.truncated ? ` Bạn chọn quá ${REWRITE_MAX_BLOCKS} đoạn, chỉ lấy ${REWRITE_MAX_BLOCKS} đoạn đầu.` : ""}
              </p>
            </div>
            <label className="block space-y-1 text-sm font-bold text-mod-text">
              Bạn muốn viết lại thế nào?
              <Textarea rows={3} maxLength={REWRITE_INSTRUCTION_MAX} placeholder="ngắn gọn hơn, giữ cụm 'trung tâm của trời đất'" value={instruction} onChange={(event) => setInstruction(event.target.value)} />
            </label>
            <div className="space-y-1">
              <p className="text-xs font-bold text-mod-text-secondary">Gợi ý nhanh</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_INSTRUCTIONS.map((quick) => <Button key={quick.label} type="button" variant="outline" size="sm" onClick={() => setInstruction(quick.text)}>{quick.label}</Button>)}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-mod-text">
              Số bản viết lại
              <Input type="number" className="w-20" min={1} max={REWRITE_MAX_VARIANTS} value={count} onChange={(event) => setCount(Number(event.target.value))} onBlur={() => setCount(clampCount(count))} />
            </label>
            <p className="flex items-start gap-2 rounded-lg bg-mod-canvas-accent p-3 text-xs text-mod-text-secondary"><Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />AI xem thêm đoạn trước và sau để giữ mạch, chỉ viết lại phần bạn chọn. Bạn luôn là người chọn và quyết định.</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-mod-border px-5 py-3">
            <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
            <Button type="button" onClick={() => void run()}><Sparkles size={16} aria-hidden="true" /> Viết lại</Button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3 px-5 py-4" aria-busy={loading}>
            {loading ? <AiRunStatus title={AI_RUN_TEXT.rewriteTitle} log={runLog.entries} startedAt={runLog.startedAt} onCancel={() => { cancelPending(); setLoading(false); setStep(0); }} /> : null}
            {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
            <div role="radiogroup" aria-label="Các bản viết lại" className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {variants.map((variant, index) => {
                const text = variant.paragraphs.join(" ");
                const delta = Math.round(((text.length - original.length) / original.length) * PERCENT);
                const hints = [...new Set([...novelHint(original, text), ...variant.novelNumbers])];
                return (
                  <label key={variant.id} className={cn("block cursor-pointer space-y-2 rounded-lg border p-3", picked === variant.id ? "border-mod-primary bg-mod-primary/5" : "border-mod-border")}>
                    <span className="flex items-center gap-2 text-sm font-bold text-mod-text">
                      <input type="radio" name="variant" className="accent-mod-primary" checked={picked === variant.id} onChange={() => setPicked(variant.id)} />
                      Bản {index + 1}
                      <span className="rounded-full bg-mod-canvas-accent px-2 py-0.5 text-xs font-semibold text-mod-text-secondary">{delta === 0 ? "Cùng độ dài" : `${delta < 0 ? "Ngắn hơn" : "Dài hơn"} ${Math.abs(delta)}%`}</span>
                    </span>
                    <Diff before={original} after={text} />
                    {hints.length ? <span role="note" className="block rounded-md bg-mod-attention/10 p-2 text-xs text-mod-attention">Có số/tên mới: {hints.join(", ")} — hãy kiểm tra. Đây là gợi ý tự động, không phải xác minh.</span> : null}
                  </label>
                );
              })}
            </div>
            {!loading && variants.length ? <p className="text-xs text-mod-text-secondary">Chọn một bản để bật nút bên dưới. Ctrl+Z trong editor hoàn tác việc thay hoặc chèn.</p> : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-mod-border px-5 py-3">
            <Button type="button" variant="outline" onClick={() => { cancelPending(); setLoading(false); setStep(0); }}>Quay lại</Button>
            <Button type="button" variant="outline" onClick={onClose}>Bỏ</Button>
            <Button type="button" variant="outline" disabled={!chosen} onClick={() => commit("below")}><ArrowDown size={15} aria-hidden="true" /> Chèn dưới đoạn</Button>
            <Button type="button" disabled={!chosen} onClick={() => commit("replace")}>Thay đoạn đã chọn</Button>
          </div>
        </>
      )}
    </>
  );
}

