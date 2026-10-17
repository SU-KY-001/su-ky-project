import { CheckCircle, Question, Scales, type Icon } from "@phosphor-icons/react";
import type { FactCard, FactConfidence, ResearchPack } from "@repo/shared";
import { cn } from "@/lib/utils";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import type { StatusTone } from "../../../labels";
import { Chip, EmptyNote } from "./stepUi";

const CONFIDENCE: Record<FactConfidence, { label: string; tone: StatusTone; icon: Icon }> = {
  CONFIRMED: { label: "Đã xác nhận", tone: "success", icon: CheckCircle },
  DEBATED: { label: "Còn tranh luận", tone: "attention", icon: Scales },
  INSUFFICIENT: { label: "Chưa đủ dữ liệu", tone: "danger", icon: Question },
};

export function FactCardsTab({ pack, highlightId }: { pack: ResearchPack; highlightId: string | null }) {
  if (pack.factCards.length === 0) return <EmptyNote>Chưa có thẻ sự kiện nào.</EmptyNote>;
  return (
    <div className="overflow-x-auto rounded-[12px] border border-slate-300 bg-mod-surface shadow-[0_4px_16px_rgba(15,23,42,.04)]">
      <table className="w-full border-collapse text-left font-moderator text-sm">
        <thead className="border-b border-slate-700 bg-slate-800 text-xs font-extrabold uppercase tracking-wider text-white">
          <tr>
            <th scope="col" className="px-4 py-3">Độ tin cậy &amp; mốc</th>
            <th scope="col" className="px-4 py-3">Sự kiện &amp; trích dẫn</th>
            <th scope="col" className="px-4 py-3">Nguồn &amp; nhân vật</th>
            <th scope="col" className="px-4 py-3">Vai trò câu chuyện</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {pack.factCards.map((card: FactCard) => {
            const confidence = CONFIDENCE[card.confidence];
            const ConfidenceIcon = confidence.icon;
            const highlighted = card.id === highlightId;
            return (
              <tr
                key={card.id}
                ref={(node) => {
                  if (node && highlighted) node.scrollIntoView({ block: "center" });
                }}
                className={cn(
                  "align-top even:bg-slate-50/80 hover:bg-sky-50/60",
                  highlighted ? "bg-mod-primary/15 ring-2 ring-inset ring-mod-primary" : undefined,
                )}
              >
                <td className="whitespace-nowrap px-4 py-3.5">
                  <div className="flex flex-col items-start gap-1">
                    <Chip tone={confidence.tone} icon={<ConfidenceIcon size={13} weight="fill" aria-hidden={true} />}>
                      {confidence.label}
                    </Chip>
                    {card.timePoint ? <ModeratorText className="font-mono text-xs font-bold text-mod-text">{card.timePoint}</ModeratorText> : null}
                    {card.location ? <ModeratorText className="text-xs text-mod-text-secondary">{card.location}</ModeratorText> : null}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-col gap-1.5">
                    <ModeratorText as="p" className="text-sm font-bold text-mod-text">{card.claim}</ModeratorText>
                    <blockquote className="border-l-2 border-mod-border pl-3 font-moderator text-xs text-mod-text-muted">
                      {card.citationSnippet}
                    </blockquote>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-col gap-1">
                    <ModeratorText className="text-xs font-semibold text-mod-text">{card.sourceReference}</ModeratorText>
                    {card.entitiesInvolved.length > 0 ? (
                      <ModeratorText className="text-xs text-mod-text-secondary">
                        Liên quan: {card.entitiesInvolved.join(", ")}
                      </ModeratorText>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <ModeratorText as="p" className="text-sm text-mod-text-muted">{card.narrativeRelevance}</ModeratorText>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TimelineTab({ pack, onOpenCard }: { pack: ResearchPack; onOpenCard: (id: string) => void }) {
  if (pack.chronologicalTimeline.length === 0) return <EmptyNote>Chưa có niên biểu.</EmptyNote>;
  return (
    <ol className="flex flex-col border-l-2 border-mod-border pl-5">
      {pack.chronologicalTimeline.map((entry, index) => {
        const linked = pack.factCards.some((card) => card.id === entry.factCardId);
        return (
          <li key={`${index}-${entry.factCardId}`} className="relative flex flex-col gap-1 pb-5 last:pb-0">
            <span className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-mod-primary bg-mod-surface" aria-hidden={true} />
            <ModeratorText className="font-mono text-sm font-bold text-mod-text">{entry.time}</ModeratorText>
            <ModeratorText as="p" className="text-sm text-mod-text">{entry.event}</ModeratorText>
            {linked ? (
              <button
                type="button"
                onClick={() => onOpenCard(entry.factCardId)}
                className="min-h-11 w-fit rounded-[10px] px-1 text-left text-sm font-bold text-mod-primary-hover underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
              >
                Xem thẻ sự kiện liên quan
              </button>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function EntitiesTab({ pack }: { pack: ResearchPack }) {
  if (pack.keyEntities.length === 0) return <EmptyNote>Chưa có nhân vật nào.</EmptyNote>;
  return (
    <div className="overflow-x-auto rounded-[12px] border border-slate-300 bg-mod-surface shadow-[0_4px_16px_rgba(15,23,42,.04)]">
      <table className="w-full border-collapse text-left font-moderator text-sm">
        <thead className="border-b border-slate-700 bg-slate-800 text-xs font-extrabold uppercase tracking-wider text-white">
          <tr>
            <th scope="col" className="px-4 py-3">Nhân vật / Thực thể</th>
            <th scope="col" className="px-4 py-3">Vai trò</th>
            <th scope="col" className="px-4 py-3">Lập trường lịch sử</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {pack.keyEntities.map((entity, index) => (
            <tr key={`${index}-${entity.name}`} className="align-top even:bg-slate-50/80 hover:bg-sky-50/60">
              <td className="px-4 py-3 font-extrabold text-mod-text">{entity.name}</td>
              <td className="px-4 py-3 font-semibold text-mod-text-muted">{entity.role}</td>
              <td className="px-4 py-3 text-mod-text-secondary">{entity.historicalStance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
