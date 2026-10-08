import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface SectionFrameProps extends PropsWithChildren {
  id?: string;
  labelledBy?: string;
}

export function SectionFrame({ children, id, labelledBy }: SectionFrameProps) {
  return (
    <section
      role="region"
      id={id}
      aria-labelledby={labelledBy}
      className="w-full px-5 py-20 md:px-7 md:py-28"
    >
      <div className="mx-auto w-full max-w-[1280px]">{children}</div>
    </section>
  );
}

interface SectionHeadingProps {
  id: string;
  title: string;
  description?: string;
  eyebrow?: string;
  align?: "left" | "center";
}

export function SectionHeading({ id, title, description, eyebrow, align = "left" }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-3", align === "center" && "mx-auto items-center text-center")}>
      {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-vermilion">{eyebrow}</p> : null}
      <h2 id={id} className="max-w-4xl font-serif text-3xl font-bold leading-tight text-ink md:text-5xl">
        {title}
      </h2>
      {description ? <p className="max-w-3xl text-base leading-7 text-ink-soft md:text-lg">{description}</p> : null}
    </div>
  );
}
