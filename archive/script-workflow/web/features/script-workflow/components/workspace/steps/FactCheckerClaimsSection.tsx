import { useState } from "react";
import { CheckCircle, WarningCircle, XCircle, type Icon } from "@phosphor-icons/react";
import { CLAIM_VERIFICATION_STATUSES, type ClaimVerificationItem } from "@repo/shared";
import { cn } from "@/lib/utils";
import type { StatusTone } from "../../../labels";
import { TONE_TEXT_CLASS } from "../StatusBadge";
import { EmptyNote, Section } from "./stepUi";

type ClaimStatus = ClaimVerificationItem["status"];
type ClaimFilter = "ALL" | ClaimStatus;

const CLAIM_STATUS: Record<ClaimStatus, { label: string; tone: StatusTone; icon: Icon; openByDefault: boolean }> = {
  CONTRADICTION: { label: "Mâu thuẫn với nguồn", tone: "danger", icon: XCircle, openByDefault: true },
  UNSUPPORTED_SPECULATION: { label: "Suy đoán chưa có dẫn chứng", tone: "attention", icon: WarningCircle, openByDefault: true },
  VERIFIED: { label: "Đã kiểm chứng", tone: "success", icon: CheckCircle, openByDefault: false },
};

/** Red and amber groups first, green last. */
const CLAIM_STATUS_ORDER: readonly ClaimStatus[] = [
  ...CLAIM_VERIFICATION_STATUSES.filter((status) => status !== "VERIFIED"),
  "VERIFIED",
];

function ClaimGroup({
  status,
  claims,
  forceOpen = false,
}: {
  status: ClaimStatus;
  claims: readonly ClaimVerificationItem[];
  forceOpen?: boolean;
}) {
  const meta = CLAIM_STATUS[status];
  const StatusIconComponent = meta.icon;
  if (claims.length === 0) return null;
  return (
    <details open={forceOpen || meta.openByDefault} className="rounded-[12px] border border-mod-border bg-mod-surface">
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer items-center gap-2 px-3.5 text-sm font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary",
          TONE_TEXT_CLASS[meta.tone],
        )}
      >
        <StatusIconComponent size={18} weight="fill" aria-hidden={true} />
        {meta.label} ({claims.length})
      </summary>
      <div className="overflow-x-auto border-t border-mod-border">
        <table className="w-full border-collapse text-left font-moderator text-sm">
          <thead className="border-b border-slate-700 bg-slate-800 text-xs font-extrabold uppercase tracking-wider text-white">
            <tr>
              <th scope="col" className="px-3.5 py-2.5">Câu trong kịch bản</th>
              <th scope="col" className="px-3.5 py-2.5">Giải thích kiểm chứng</th>
              <th scope="col" className="px-3.5 py-2.5">Thẻ sự kiện khớp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {claims.map((claim, index) => (
              <tr key={`${index}-${claim.scriptSentence}`} className="align-top even:bg-slate-50/80 hover:bg-sky-50/60">
                <td className="px-3.5 py-3 font-bold text-mod-text">“{claim.scriptSentence}”</td>
                <td className="px-3.5 py-3 text-mod-text-muted">{claim.explanation}</td>
                <td className="whitespace-nowrap px-3.5 py-3 font-mono text-xs text-mod-text-secondary">
                  {claim.matchedFactCardId ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Verified-claims section: status filter chips plus per-status claim tables. */
export function FactCheckerClaimsSection({ claims }: { claims: readonly ClaimVerificationItem[] }) {
  const [filter, setFilter] = useState<ClaimFilter>("ALL");

  const contradictionClaims = claims.filter((claim) => claim.status === "CONTRADICTION");
  const speculationClaims = claims.filter((claim) => claim.status === "UNSUPPORTED_SPECULATION");
  const verifiedClaims = claims.filter((claim) => claim.status === "VERIFIED");

  const filterOptions: readonly { value: ClaimFilter; label: string; count: number }[] = [
    { value: "ALL", label: "Tất cả", count: claims.length },
    { value: "CONTRADICTION", label: CLAIM_STATUS.CONTRADICTION.label, count: contradictionClaims.length },
    {
      value: "UNSUPPORTED_SPECULATION",
      label: CLAIM_STATUS.UNSUPPORTED_SPECULATION.label,
      count: speculationClaims.length,
    },
    { value: "VERIFIED", label: CLAIM_STATUS.VERIFIED.label, count: verifiedClaims.length },
  ];

  const filteredClaims = filter === "ALL" ? claims : claims.filter((claim) => claim.status === filter);

  return (
    <Section title={`Câu đã kiểm chứng (${claims.length})`}>
      {claims.length === 0 ? (
        <EmptyNote>Chưa có câu nào được kiểm chứng.</EmptyNote>
      ) : (
        <>
          <div role="group" aria-label="Lọc câu đã kiểm chứng theo trạng thái" className="flex flex-wrap gap-2">
            {filterOptions.map((option) => {
              const active = filter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full border px-3 font-moderator text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary",
                    active
                      ? "border-mod-primary bg-mod-primary text-white"
                      : "border-mod-border bg-mod-surface text-mod-text-muted hover:bg-mod-canvas-accent",
                  )}
                >
                  {option.label} ({option.count})
                </button>
              );
            })}
          </div>

          {filter === "ALL" ? (
            CLAIM_STATUS_ORDER.map((status) => (
              <ClaimGroup key={status} status={status} claims={claims.filter((claim) => claim.status === status)} />
            ))
          ) : filteredClaims.length === 0 ? (
            <EmptyNote>Không có câu nào thuộc nhóm này.</EmptyNote>
          ) : (
            <ClaimGroup status={filter} claims={filteredClaims} forceOpen={true} />
          )}
        </>
      )}
    </Section>
  );
}
