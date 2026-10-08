import { Repeat } from "@phosphor-icons/react";
import { SOURCE_TIER_LABELS, STEP_OUTPUT_SCHEMAS, type EvaluatedSource } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { BulletList, Callout, Chip, EmptyNote, ExternalLink, ParsedOutput, Section } from "./stepUi";
import { ReliabilityScore } from "./ReliabilityScore";

const ROLE_LABELS: Record<EvaluatedSource["crossVerificationRole"], string> = {
  DISCOVERY: "Nguồn khám phá",
  CLAIM_SUPPORT: "Nguồn khẳng định",
};

function EvaluatedSourceCard({ source }: { source: EvaluatedSource }) {
  return (
    <li className="flex flex-col gap-2 rounded-[12px] border border-mod-border bg-mod-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <ModeratorText as="h4" className="min-w-0 text-base font-extrabold text-mod-text">{source.name}</ModeratorText>
        <ReliabilityScore score={source.reliabilityScore} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip tone="info">{SOURCE_TIER_LABELS[source.tier]}</Chip>
        <Chip>{ROLE_LABELS[source.crossVerificationRole]}</Chip>
        {source.echoChamberFlag ? (
          <Chip tone="attention" icon={<Repeat size={13} weight="bold" aria-hidden={true} />}>
            Có thể là vòng lặp trích dẫn
          </Chip>
        ) : null}
      </div>
      {source.notes ? <ModeratorText as="p" className="text-sm text-mod-text-muted">{source.notes}</ModeratorText> : null}
      {source.debatedDetails.length > 0 ? (
        <div className="flex flex-col gap-1">
          <ModeratorText className="text-xs font-bold text-mod-text-muted">Chi tiết còn tranh luận</ModeratorText>
          <BulletList items={source.debatedDetails} />
        </div>
      ) : null}
      {source.locationInSource ? (
        <ModeratorText as="p" className="text-xs text-mod-text-secondary">Vị trí trong nguồn: {source.locationInSource}</ModeratorText>
      ) : null}
      {source.url ? (
        <ModeratorText as="p" className="text-xs">
          <ExternalLink url={source.url}>{source.url}</ExternalLink>
        </ModeratorText>
      ) : null}
    </li>
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
              <ul className="grid gap-3 lg:grid-cols-2">
                {data.evaluatedSources.map((source) => (
                  <EvaluatedSourceCard key={source.id} source={source} />
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </ParsedOutput>
  );
}
