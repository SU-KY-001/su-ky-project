import { Repeat } from "@phosphor-icons/react";
import { SOURCE_TIER_LABELS, STEP_OUTPUT_SCHEMAS, type EvaluatedSource } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { BulletList, Callout, Chip, EmptyNote, ExternalLink, ParsedOutput, Section } from "./stepUi";
import { ReliabilityScore } from "./ReliabilityScore";

const ROLE_LABELS: Record<EvaluatedSource["crossVerificationRole"], string> = {
  DISCOVERY: "Nguồn khám phá",
  CLAIM_SUPPORT: "Nguồn khẳng định",
};

function EvaluatedSourcesTable({ sources }: { sources: readonly EvaluatedSource[] }) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-slate-300 bg-mod-surface shadow-[0_4px_16px_rgba(15,23,42,.04)]">
      <table className="w-full border-collapse text-left font-moderator text-sm">
        <thead className="border-b border-slate-700 bg-slate-800 text-xs font-extrabold uppercase tracking-wider text-white">
          <tr>
            <th scope="col" className="px-4 py-3">Nguồn tư liệu</th>
            <th scope="col" className="px-4 py-3">Nhóm &amp; vai trò</th>
            <th scope="col" className="px-4 py-3">Độ tin cậy</th>
            <th scope="col" className="px-4 py-3">Ghi chú &amp; tranh luận</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {sources.map((source) => (
            <tr key={source.id} className="align-top even:bg-slate-50/80 hover:bg-sky-50/60">
              <td className="px-4 py-3.5">
                <div className="flex flex-col gap-0.5">
                  <ModeratorText className="text-sm font-extrabold text-mod-text">{source.name}</ModeratorText>
                  {source.locationInSource ? (
                    <ModeratorText className="text-xs text-mod-text-secondary">
                      Vị trí: {source.locationInSource}
                    </ModeratorText>
                  ) : null}
                  {source.url ? (
                    <ModeratorText className="text-xs">
                      <ExternalLink url={source.url}>{source.url}</ExternalLink>
                    </ModeratorText>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex flex-wrap gap-1.5">
                  <Chip tone="info">{SOURCE_TIER_LABELS[source.tier]}</Chip>
                  <Chip>{ROLE_LABELS[source.crossVerificationRole]}</Chip>
                  {source.echoChamberFlag ? (
                    <Chip tone="attention" icon={<Repeat size={13} weight="bold" aria-hidden={true} />}>
                      Có thể là vòng lặp trích dẫn
                    </Chip>
                  ) : null}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3.5">
                <ReliabilityScore score={source.reliabilityScore} />
              </td>
              <td className="px-4 py-3.5">
                <div className="flex flex-col gap-1.5">
                  {source.notes ? <ModeratorText as="p" className="text-sm text-mod-text-muted">{source.notes}</ModeratorText> : null}
                  {source.debatedDetails.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <ModeratorText className="text-xs font-bold text-mod-text-muted">Chi tiết còn tranh luận:</ModeratorText>
                      <BulletList items={source.debatedDetails} />
                    </div>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Automatic step, read-only: assessed sources, warnings and the cross-check summary. */
export function SourceEvaluatorPanel({ output }: { output: unknown }) {
  return (
    <ParsedOutput schema={STEP_OUTPUT_SCHEMAS.SOURCE_EVALUATOR} output={output}>
      {(data) => (
        <div className="flex flex-col gap-6">
          {data.flaggedInsufficientSources.length > 0 ? (
            <Callout tone="danger" title="Nguồn chưa đủ tin cậy" role="status">
              <BulletList items={data.flaggedInsufficientSources} />
            </Callout>
          ) : null}
          {data.singleSidedSourceWarnings.length > 0 ? (
            <Callout tone="attention" title="Nguồn chỉ có một phía" role="status">
              <BulletList items={data.singleSidedSourceWarnings} />
            </Callout>
          ) : null}

          <Section title="Tóm tắt đối chiếu">
            <ModeratorText as="p" className="text-sm text-mod-text">
              {data.crossVerificationSummary}
            </ModeratorText>
          </Section>

          <Section title={`Nguồn đã thẩm định (${data.evaluatedSources.length})`}>
            {data.evaluatedSources.length === 0 ? (
              <EmptyNote>Chưa có nguồn nào được thẩm định.</EmptyNote>
            ) : (
              <EvaluatedSourcesTable sources={data.evaluatedSources} />
            )}
          </Section>
        </div>
      )}
    </ParsedOutput>
  );
}
