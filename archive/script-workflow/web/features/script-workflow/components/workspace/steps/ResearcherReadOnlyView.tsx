import type { NarrativeMenuOption, ResearchConsultation } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { BulletList, Callout, Section } from "./stepUi";
import { ReadOnlySourcesCatalogue } from "./ResearcherSources";

function ReadOnlyNarrativeCard({ option }: { option: NarrativeMenuOption }) {
  return (
    <li className="flex flex-col gap-2 rounded-[12px] border border-mod-border bg-mod-surface p-4">
      <ModeratorText as="h4" className="text-base font-extrabold text-mod-text">
        {option.focusLabel}
      </ModeratorText>
      <ModeratorText as="p" className="text-sm text-mod-text-muted">
        {option.angleDescription}
      </ModeratorText>
      <ModeratorText as="p" className="text-sm text-mod-text-secondary">
        <span className="font-bold text-mod-text-muted">Vì sao nên chọn: </span>
        {option.recommendedBecause}
      </ModeratorText>
      <ModeratorText as="p" className="text-sm font-bold text-mod-text">
        Series: {option.seriesTitle}
      </ModeratorText>
      <ol className="list-decimal pl-5 text-sm text-mod-text">
        {option.episodeTitles.map((title, index) => (
          <li key={index}>{title}</li>
        ))}
      </ol>
    </li>
  );
}

/** Read-only Gate 0 view: topic summary, filterable source catalogue, proposed narrative angles. */
export function ResearcherReadOnlyView({ data }: { data: ResearchConsultation }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-[14px] border border-sky-200 border-l-4 border-l-mod-primary bg-gradient-to-br from-sky-50/90 via-white to-slate-50 p-4 shadow-[0_6px_18px_rgba(2,132,199,.07)] sm:p-5">
        <ModeratorText as="h2" className="text-xl font-extrabold text-mod-text">
          {data.topic}
        </ModeratorText>
        <ModeratorText as="p" className="text-sm text-mod-text-secondary">
          {data.historicalTimeframe} · {data.geographicScope}
        </ModeratorText>
      </div>

      <ReadOnlySourcesCatalogue sources={data.sourcesCatalogue} />

      <Section title={`Hướng kể được đề xuất (${data.narrativeMenu.length})`}>
        {data.narrativeMenu.length === 0 ? (
          <Callout tone="attention" title="AI không tìm được đủ dữ liệu" role="status">
            Chưa có hướng kể nào được đề xuất. Bạn có thể làm lại hoặc tự nhập trọng tâm.
          </Callout>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.narrativeMenu.map((option) => (
              <ReadOnlyNarrativeCard key={option.focusType} option={option} />
            ))}
          </ul>
        )}
      </Section>

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
