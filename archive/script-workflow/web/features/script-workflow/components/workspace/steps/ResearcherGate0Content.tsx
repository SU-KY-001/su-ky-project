import type { ResearchConsultation, WorkflowStep } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { BulletList } from "./stepUi";
import { Gate0FocusSection } from "./ResearcherGate0FocusSection";
import { Gate0SourcesSection } from "./ResearcherGate0SourcesSection";

type InteractiveGate0ContentProps = {
  workflowId: number;
  step: WorkflowStep;
  data: ResearchConsultation;
  onConflict: () => void;
};

/** Interactive Gate 0: editable source catalogue (DIRECT_EDIT save) plus the narrative focus selector. */
export function InteractiveGate0Content({ workflowId, step, data, onConflict }: InteractiveGate0ContentProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-[14px] border border-sky-200 border-l-4 border-l-mod-primary bg-gradient-to-br from-sky-50/90 via-white to-slate-50 p-4 shadow-[0_6px_18px_rgba(2,132,199,.07)] sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-mod-primary/15 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-mod-primary-hover">
            Tổng quan đề tài
          </span>
        </div>
        <ModeratorText as="h2" className="text-xl font-extrabold text-mod-text">
          {data.topic}
        </ModeratorText>
        <div className="grid gap-3 pt-1 lg:grid-cols-2">
          <div className="rounded-[10px] border border-sky-200/80 bg-white/90 p-3">
            <ModeratorText className="text-[11px] font-extrabold uppercase tracking-wider text-mod-primary-hover">
              Khung thời gian lịch sử
            </ModeratorText>
            <ModeratorText as="p" className="mt-1 text-sm text-mod-text">
              {data.historicalTimeframe}
            </ModeratorText>
          </div>
          <div className="rounded-[10px] border border-sky-200/80 bg-white/90 p-3">
            <ModeratorText className="text-[11px] font-extrabold uppercase tracking-wider text-mod-primary-hover">
              Phạm vi địa lý &amp; chiến trường
            </ModeratorText>
            <ModeratorText as="p" className="mt-1 text-sm text-mod-text">
              {data.geographicScope}
            </ModeratorText>
          </div>
        </div>
      </div>

      <Gate0SourcesSection workflowId={workflowId} step={step} data={data} onConflict={onConflict} />

      <Gate0FocusSection workflowId={workflowId} data={data} />

      <details className="rounded-[10px] border border-mod-border bg-mod-canvas">
        <summary className="flex min-h-11 cursor-pointer items-center px-3.5 text-sm font-bold text-mod-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary">
          Câu hỏi nghiên cứu ban đầu ({data.initialResearchQuestions.length})
        </summary>
        <div className="px-3.5 pb-3.5">
          <BulletList items={data.initialResearchQuestions} />
        </div>
      </details>
    </div>
  );
}
