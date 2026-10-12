import {
  SOURCE_TIER_LABELS,
  STEP_OUTPUT_SCHEMAS,
  type EvaluatedSource,
  type GetWorkflowResponse,
  type StepVersion,
} from "@repo/shared";
import { findAncestorVersion } from "../workspace/workspaceModel";
import { ReliabilityScore } from "../workspace/steps/ReliabilityScore";
import { Chip, EmptyNote, ExternalLink, Section, UnreadableStepData } from "../workspace/steps/stepUi";

function ReferenceSourcesTable({ sources }: { sources: readonly EvaluatedSource[] }) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-slate-300 bg-mod-surface shadow-[0_4px_16px_rgba(15,23,42,.04)]">
      <table className="w-full border-collapse text-left font-moderator text-sm">
        <thead className="border-b border-slate-700 bg-slate-800 text-xs font-extrabold uppercase tracking-wider text-white">
          <tr>
            <th scope="col" className="px-4 py-3">Nguồn tư liệu</th>
            <th scope="col" className="px-4 py-3">Nhóm nguồn</th>
            <th scope="col" className="px-4 py-3">Độ tin cậy</th>
            <th scope="col" className="px-4 py-3">Liên kết</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {sources.map((source) => (
            <tr key={source.id} className="align-top even:bg-slate-50/80 hover:bg-sky-50/60">
              <td className="px-4 py-3 font-extrabold text-mod-text">{source.name}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <Chip tone="info">{SOURCE_TIER_LABELS[source.tier]}</Chip>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <ReliabilityScore score={source.reliabilityScore} />
              </td>
              <td className="px-4 py-3 text-xs">
                {source.url ? <ExternalLink url={source.url}>{source.url}</ExternalLink> : <span className="text-mod-text-low">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PublicationSourcesSection({
  workflow,
  factCheckerVersion,
}: {
  workflow: GetWorkflowResponse;
  factCheckerVersion: StepVersion | null;
}) {
  const sourceEvaluatorVersion = factCheckerVersion
    ? findAncestorVersion(workflow, factCheckerVersion, "SOURCE_EVALUATOR")
    : null;
  const parsed = sourceEvaluatorVersion
    ? STEP_OUTPUT_SCHEMAS.SOURCE_EVALUATOR.safeParse(sourceEvaluatorVersion.outputJson)
    : null;

  if (!parsed || !parsed.success) {
    return (
      <Section title="Nguồn tham khảo">
        <UnreadableStepData output={sourceEvaluatorVersion?.outputJson ?? null} />
      </Section>
    );
  }

  const sources = parsed.data.evaluatedSources;

  return (
    <Section title={`Nguồn tham khảo (${sources.length})`}>
      {sources.length === 0 ? (
        <EmptyNote>Chưa có nguồn tham khảo được ghi nhận.</EmptyNote>
      ) : (
        <ReferenceSourcesTable sources={sources} />
      )}
    </Section>
  );
}
