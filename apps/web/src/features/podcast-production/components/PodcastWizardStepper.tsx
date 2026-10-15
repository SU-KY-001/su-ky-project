import type { ReactElement } from "react";
import { Check, ClipboardCheck, FileText, Info, Mic, PencilLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PodcastWizardStep } from "../podcastWizardState";
import { AnimatedBeam } from "./AnimatedBeam";

export interface PodcastWizardCompletion {
  information: boolean;
  script: boolean;
  voice: boolean;
  review: boolean;
}

export interface PodcastWizardStepView {
  id: PodcastWizardStep;
  label: string;
  icon: LucideIcon;
  number: number;
  complete: boolean;
  disabled: boolean;
  statusLabel: "Đang thao tác" | "Hoàn thành" | "Chưa hoàn thành";
}

const definitions = [
  { id: "information", label: "Thông tin", icon: Info },
  { id: "script", label: "Kịch bản", icon: FileText },
  { id: "voice", label: "Giọng đọc", icon: Mic },
  { id: "review", label: "Xem lại và lưu", icon: ClipboardCheck },
] satisfies Array<{
  id: PodcastWizardStep;
  label: string;
  icon: typeof Info;
}>;

export function buildPodcastWizardSteps(
  completion: PodcastWizardCompletion,
  activeStep: PodcastWizardStep,
): PodcastWizardStepView[] {
  return definitions.map((step, index) => ({
    ...step,
    number: index + 1,
    complete: completion[step.id],
    disabled: false,
    statusLabel: step.id === activeStep
      ? "Đang thao tác"
      : completion[step.id] ? "Hoàn thành" : "Chưa hoàn thành",
  }));
}

export function PodcastWizardStepper({
  activeStep,
  completion,
  onSelect,
}: {
  activeStep: PodcastWizardStep;
  completion: PodcastWizardCompletion;
  onSelect: (step: PodcastWizardStep) => void;
}): ReactElement {
  const steps = buildPodcastWizardSteps(completion, activeStep);
  const activeStepIndex = steps.findIndex((step) => step.id === activeStep);
  return (
    <nav aria-label="Các bước tạo podcast" className="overflow-x-auto">
      <div className="relative min-w-[560px]">
        <AnimatedBeam stepCount={steps.length} activeStepIndex={activeStepIndex} />
        <ol className="relative grid grid-cols-4 gap-0">
          {steps.map((step) => {
            const Icon = step.icon;
            const active = activeStep === step.id;
            return (
              <li key={step.id} className="relative flex justify-center">
                <button
                  type="button"
                  aria-current={active ? "step" : undefined}
                  aria-label={`${step.number}. ${step.label} — ${step.statusLabel}`}
                  onClick={() => onSelect(step.id)}
                  className={cn(
                    "group relative z-10 flex min-w-28 flex-col items-center gap-1.5 rounded-lg px-2 py-0.5 text-center text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-mod-primary focus-visible:ring-offset-2",
                    active ? "text-mod-primary" : "text-mod-text-secondary hover:text-mod-text",
                  )}
                >
                  <span
                    className={cn(
                      "relative flex size-8 items-center justify-center rounded-full border bg-mod-surface transition-[background-color,border-color,color,box-shadow] duration-200",
                      active && "border-mod-primary/45 bg-[color-mix(in_srgb,var(--modPrimary)_10%,var(--modSurface))] text-mod-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--modPrimary)_10%,transparent),0_3px_8px_color-mix(in_srgb,var(--modPrimary)_16%,transparent)]",
                      step.complete && !active && "border-mod-success/35 bg-[color-mix(in_srgb,var(--modSuccess)_10%,var(--modSurface))] text-mod-success shadow-[0_2px_6px_color-mix(in_srgb,var(--modSuccess)_10%,transparent)]",
                      !active && !step.complete && "border-mod-border text-mod-text-secondary shadow-[0_1px_3px_color-mix(in_srgb,var(--modText)_8%,transparent)] group-hover:border-mod-primary/50",
                    )}
                  >
                    {active ? (
                      <PencilLine size={15} strokeWidth={2} aria-hidden="true" />
                    ) : step.complete ? (
                      <Check size={15} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                    )}
                  </span>
                  <span className={cn("leading-5", active && "font-semibold")}>{step.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

