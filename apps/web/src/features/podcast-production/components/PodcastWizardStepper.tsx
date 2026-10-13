import type { ReactElement } from "react";
import { Check, ClipboardCheck, FileText, Info, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PodcastWizardStep } from "../podcastWizardState";

export interface PodcastWizardCompletion {
  information: boolean;
  script: boolean;
  voice: boolean;
  review: boolean;
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

export function buildPodcastWizardSteps(completion: PodcastWizardCompletion) {
  return definitions.map((step, index) => ({
    ...step,
    number: index + 1,
    complete: completion[step.id],
    disabled: false,
    statusLabel: completion[step.id] ? "Hoàn thành" : "Chưa hoàn thành",
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
  const steps = buildPodcastWizardSteps(completion);
  return (
    <nav aria-label="Các bước tạo podcast" className="overflow-x-auto">
      <ol className="grid min-w-[680px] grid-cols-4 gap-0">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const active = activeStep === step.id;
          return (
            <li key={step.id} className="relative flex items-center">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute right-1/2 left-0 top-5 h-px bg-mod-border"
                />
              ) : null}
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute right-0 left-1/2 top-5 h-px bg-mod-border"
                />
              ) : null}
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                aria-label={`${step.number}. ${step.label} — ${step.statusLabel}`}
                onClick={() => onSelect(step.id)}
                className={cn(
                  "relative z-10 mx-auto flex min-w-32 flex-col items-center gap-2 rounded-lg px-3 py-1 text-center text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-mod-primary focus-visible:ring-offset-2",
                  active ? "text-mod-primary" : "text-mod-text-secondary hover:text-mod-text",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border bg-mod-surface transition-colors",
                    active && "border-mod-primary bg-mod-primary text-white",
                    step.complete && !active &&
                      "podcast-step-complete border-mod-success bg-mod-success text-white",
                  )}
                >
                  {step.complete ? (
                    <Check size={19} aria-hidden="true" />
                  ) : active ? (
                    <Icon size={18} aria-hidden="true" />
                  ) : (
                    step.number
                  )}
                </span>
                <span>{step.label}</span>
                <span className="sr-only">{step.statusLabel}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

