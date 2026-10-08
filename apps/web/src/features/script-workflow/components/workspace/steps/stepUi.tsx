import type { ReactNode } from "react";
import { CheckCircle, Info, WarningCircle, XCircle, type Icon } from "@phosphor-icons/react";
import type { z } from "zod";
import { cn } from "@/lib/utils";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import type { StatusTone } from "../../../labels";
import { TONE_TEXT_CLASS } from "../StatusBadge";

const CALLOUT_CLASS: Record<StatusTone, string> = {
  neutral: "border-mod-border bg-mod-canvas",
  info: "border-mod-primary/40 bg-mod-primary/10",
  attention: "border-mod-attention/40 bg-mod-attention/10",
  success: "border-mod-success/40 bg-mod-success/10",
  danger: "border-mod-danger/40 bg-mod-danger/10",
};

const CALLOUT_ICON: Record<StatusTone, Icon> = {
  neutral: Info,
  info: Info,
  attention: WarningCircle,
  success: CheckCircle,
  danger: XCircle,
};

type CalloutProps = { tone: StatusTone; title?: string; children: ReactNode; role?: "status" | "alert" };

/** Coloured block that always carries an icon and text, never colour alone. */
export function Callout({ tone, title, children, role }: CalloutProps) {
  const IconComponent = CALLOUT_ICON[tone];
  return (
    <div role={role} className={cn("flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3", CALLOUT_CLASS[tone])}>
      <IconComponent size={20} weight="fill" className={cn("mt-0.5 shrink-0", TONE_TEXT_CLASS[tone])} aria-hidden={true} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? <ModeratorText className="text-sm font-extrabold text-mod-text">{title}</ModeratorText> : null}
        <div className="text-sm text-mod-text-muted">{children}</div>
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <ModeratorText as="h3" className="text-sm font-extrabold uppercase tracking-wide text-mod-text-muted">{children}</ModeratorText>;
}

export function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <ModeratorText as="p" className="text-sm text-mod-text-secondary">{children}</ModeratorText>;
}

export function Chip({ children, tone = "neutral", icon }: { children: ReactNode; tone?: StatusTone; icon?: ReactNode }) {
  return (
    <ModeratorText
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold",
        CALLOUT_CLASS[tone],
        TONE_TEXT_CLASS[tone],
      )}
    >
      {icon}
      {children}
    </ModeratorText>
  );
}

export function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-mod-text">
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </ul>
  );
}

/** Opens `url` in a new tab only for http(s) links; anything else renders as plain text. */
export function ExternalLink({ url, children }: { url: string; children: ReactNode }) {
  const safe = /^https?:\/\//i.test(url);
  if (!safe) return <span className="break-all">{children}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all font-semibold text-mod-primary-hover underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
    >
      {children}
      <span className="sr-only"> (mở tab mới)</span>
    </a>
  );
}

/** Shown when `outputJson` does not match the step schema: friendly message plus the raw JSON, collapsed. */
export function UnreadableStepData({ output }: { output: unknown }) {
  return (
    <div className="flex flex-col gap-3">
      <Callout tone="attention" title="Dữ liệu bước này không đọc được" role="status">
        Nội dung không khớp định dạng mong đợi, nên chưa thể hiển thị đẹp. Bạn có thể xem dữ liệu gốc bên dưới hoặc báo cho quản trị viên.
      </Callout>
      <details className="rounded-[10px] border border-mod-border bg-mod-canvas">
        <summary className="flex min-h-11 cursor-pointer items-center px-3.5 text-sm font-bold text-mod-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary">
          Xem dữ liệu gốc
        </summary>
        <pre className="max-h-96 overflow-auto px-3.5 pb-3.5 font-mono text-xs whitespace-pre-wrap text-mod-text-muted">
          {JSON.stringify(output, null, 2) ?? "Không có dữ liệu"}
        </pre>
      </details>
    </div>
  );
}

type ParsedOutputProps<S extends z.ZodType> = {
  schema: S;
  output: unknown;
  children: (data: z.output<S>) => ReactNode;
};

/** Parses `outputJson` with the step schema; renders the fallback instead of throwing or casting. */
export function ParsedOutput<S extends z.ZodType>({ schema, output, children }: ParsedOutputProps<S>) {
  const result = schema.safeParse(output);
  if (!result.success) return <UnreadableStepData output={output} />;
  return <>{children(result.data)}</>;
}
