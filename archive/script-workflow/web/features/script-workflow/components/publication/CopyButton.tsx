import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { cn } from "@/lib/utils";
import { COPIED_LABEL_MS } from "../../constants";

const FALLBACK_ROWS = 4;
const ICON_SIZE = 16;

type CopyButtonProps = {
  label: string;
  text: string;
  variant?: "primary" | "secondary";
  className?: string;
};

/**
 * Copies `text` via `navigator.clipboard.writeText`. Shows "Đã chép" for `COPIED_LABEL_MS`
 * and announces via `aria-live="polite"`. Falls back to a selectable textarea if clipboard fails.
 */
export function CopyButton({ label, text, variant = "secondary", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!navigator.clipboard?.writeText) {
      setFallbackOpen(true);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setFallbackOpen(false);
      setCopied(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, COPIED_LABEL_MS);
    } catch {
      setFallbackOpen(true);
    }
  };

  const selectFallbackText = () => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  };

  const buttonTone =
    variant === "primary"
      ? "bg-mod-primary text-white hover:bg-mod-primary-hover"
      : "border border-mod-border bg-mod-surface text-mod-text hover:bg-mod-canvas-accent";

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="inline-flex items-center">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary",
            buttonTone,
            className,
          )}
        >
          {copied ? (
            <Check size={ICON_SIZE} weight="bold" className={variant === "primary" ? "text-white" : "text-mod-success"} aria-hidden={true} />
          ) : (
            <Copy size={ICON_SIZE} aria-hidden={true} />
          )}
          <ModeratorText>{copied ? "Đã chép" : label}</ModeratorText>
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? "Đã chép" : ""}
        </span>
      </div>

      {fallbackOpen ? (
        <div
          role="region"
          aria-label="Sao chép dự phòng"
          className="flex w-full max-w-xl flex-col gap-2 rounded-[12px] border border-mod-border bg-mod-canvas p-3"
        >
          <ModeratorText as="p" className="text-xs text-mod-text-muted">
            Trình duyệt không cho phép sao chép tự động. Hãy chọn văn bản bên dưới và nhấn Ctrl+C (hoặc Cmd+C).
          </ModeratorText>
          <textarea
            ref={textareaRef}
            readOnly
            rows={FALLBACK_ROWS}
            value={text}
            aria-label={label}
            className="w-full rounded-[8px] border border-mod-border bg-mod-surface p-2.5 font-moderator text-xs text-mod-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectFallbackText}
              className="inline-flex min-h-11 items-center rounded-[10px] bg-mod-primary px-3.5 text-xs font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"
            >
              <ModeratorText>Chọn văn bản</ModeratorText>
            </button>
            <button
              type="button"
              onClick={() => setFallbackOpen(false)}
              className="inline-flex min-h-11 items-center rounded-[10px] border border-mod-border bg-mod-surface px-3.5 text-xs font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"
            >
              <ModeratorText>Đóng</ModeratorText>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
