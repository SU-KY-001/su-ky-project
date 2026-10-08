import { useState } from "react";
import { ArrowsClockwise, CheckCircle, WarningCircle, XCircle, type Icon } from "@phosphor-icons/react";
import {
  CLAIM_VERIFICATION_STATUSES,
  STEP_OUTPUT_SCHEMAS,
  type ClaimVerificationItem,
  type ReviewReport,
  type StepType,
  type StepVersion,
  type WorkflowStep,
} from "@repo/shared";
import { cn } from "@/lib/utils";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import type { StatusTone } from "../../../labels";
import { FallbackJsonEditor } from "../gates/FallbackJsonEditor";
import { buildStoryPlannerFeedbackFromClaims } from "../gates/gateDrafts";
import { TONE_TEXT_CLASS } from "../StatusBadge";
import { OralizerPanel } from "./OralizerPanel";
import { BulletList, Callout, Chip, EmptyNote, ParsedOutput, Section } from "./stepUi";

type ClaimStatus = ClaimVerificationItem["status"];
type ClaimFilter = "ALL" | ClaimStatus;

const PERCENT = 100;
const ICON_SIZE_SM = 16;

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

const LINTER_FLAGS: readonly { key: keyof Omit<ReviewReport["oralLinter"], "errorDetails">; ok: string; bad: string }[] = [
  { key: "hasForbiddenHyphens", ok: "Không có gạch đầu dòng", bad: "Có gạch đầu dòng" },
  { key: "hasForbiddenColons", ok: "Không có dấu hai chấm", bad: "Có dấu hai chấm" },
  { key: "hasForbiddenParentheses", ok: "Không có ngoặc đơn", bad: "Có ngoặc đơn" },
  { key: "hasFragmentedSentences", ok: "Không có câu cụt", bad: "Có câu cụt" },
];

function ScoreBar({ score }: { score: number }) {
  const width = Math.min(PERCENT, Math.max(0, score));
  return (
    <div className="flex items-center gap-3" role="img" aria-label={`Điểm kiểm định ${score} trên ${PERCENT}`}>
      <div className="h-2.5 w-40 overflow-hidden rounded-full bg-mod-canvas-accent" aria-hidden={true}>
        <div className="h-full rounded-full bg-mod-primary" style={{ width: `${width}%` }} />
      </div>
      <ModeratorText className="text-2xl font-extrabold tabular-nums text-mod-text" aria-hidden={true}>
        {score}
        <span className="text-sm font-bold text-mod-text-secondary">/{PERCENT}</span>
      </ModeratorText>
    </div>
  );
}

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
      <ul className="flex flex-col gap-3 px-3.5 pb-3.5">
        {claims.map((claim, index) => (
          <li key={`${index}-${claim.scriptSentence}`} className="flex flex-col gap-1 border-t border-mod-border pt-3">
            <ModeratorText as="p" className="text-sm font-bold text-mod-text">
              “{claim.scriptSentence}”
            </ModeratorText>
            <ModeratorText as="p" className="text-sm text-mod-text-muted">
              {claim.explanation}
            </ModeratorText>
            {claim.matchedFactCardId ? (
              <ModeratorText as="p" className="text-xs text-mod-text-secondary">
                Thẻ sự kiện khớp: <span className="font-mono">{claim.matchedFactCardId}</span>
              </ModeratorText>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}

type ReportViewProps = {
  report: ReviewReport;
  interactive: boolean;
  onRequestRerun?: (stepType: StepType, prefillFeedback?: string) => void;
};

function ReportView({ report, interactive, onRequestRerun }: ReportViewProps) {
  const [filter, setFilter] = useState<ClaimFilter>("ALL");

  const contradictionClaims = report.claimVerification.filter((claim) => claim.status === "CONTRADICTION");
  const speculationClaims = report.claimVerification.filter((claim) => claim.status === "UNSUPPORTED_SPECULATION");
  const verifiedClaims = report.claimVerification.filter((claim) => claim.status === "VERIFIED");
  const hasRedOrAmber = contradictionClaims.length > 0 || speculationClaims.length > 0;

  const filterOptions: readonly { value: ClaimFilter; label: string; count: number }[] = [
    { value: "ALL", label: "Tất cả", count: report.claimVerification.length },
    { value: "CONTRADICTION", label: CLAIM_STATUS.CONTRADICTION.label, count: contradictionClaims.length },
    {
      value: "UNSUPPORTED_SPECULATION",
      label: CLAIM_STATUS.UNSUPPORTED_SPECULATION.label,
      count: speculationClaims.length,
    },
    { value: "VERIFIED", label: CLAIM_STATUS.VERIFIED.label, count: verifiedClaims.length },
  ];

  const filteredClaims =
    filter === "ALL"
      ? report.claimVerification
      : report.claimVerification.filter((claim) => claim.status === filter);

  return (
    <div className="flex flex-col gap-5">
      {report.passed ? null : (
        <Callout tone="danger" title="Báo cáo kiểm định chưa đạt" role="status">
          Hãy xem các câu bên dưới trước khi xuất bản.
        </Callout>
      )}
      <div className="flex flex-wrap items-center gap-4">
        {report.passed ? (
          <Chip tone="success" icon={<CheckCircle size={14} weight="fill" aria-hidden={true} />}>
            Đạt
          </Chip>
        ) : (
          <Chip tone="danger" icon={<XCircle size={14} weight="fill" aria-hidden={true} />}>
            Chưa đạt
          </Chip>
        )}
        <ScoreBar score={report.overallScore} />
      </div>

      {hasRedOrAmber && interactive && onRequestRerun ? (
        <Callout tone="attention" title="Hướng xử lý khi có câu mâu thuẫn hoặc suy đoán" role="status">
          <div className="flex flex-col gap-2.5">
            <ModeratorText as="p" className="text-sm text-mod-text-muted">
              Bạn có thể chạy lại bước kiểm định trên cùng bản văn nói, hoặc quay về làm lại từ bước Dàn ý 3 tập để AI viết lại kịch bản.
            </ModeratorText>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onRequestRerun("FACT_CHECKER")}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
              >
                <ArrowsClockwise size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
                Làm lại
              </button>
              <button
                type="button"
                onClick={() =>
                  onRequestRerun("STORY_PLANNER", buildStoryPlannerFeedbackFromClaims(report.claimVerification))
                }
                className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-attention bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-attention hover:bg-mod-attention/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
              >
                <ArrowsClockwise size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
                Làm lại từ dàn ý
              </button>
            </div>
          </div>
        </Callout>
      ) : null}

      <Section title="Tóm tắt cho Moderator">
        <ModeratorText as="p" className="rounded-[10px] bg-mod-canvas px-3.5 py-3 text-sm text-mod-text">
          {report.moderatorSummaryFeedback}
        </ModeratorText>
      </Section>

      <Section title={`Câu đã kiểm chứng (${report.claimVerification.length})`}>
        {report.claimVerification.length === 0 ? (
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
                <ClaimGroup
                  key={status}
                  status={status}
                  claims={report.claimVerification.filter((claim) => claim.status === status)}
                />
              ))
            ) : filteredClaims.length === 0 ? (
              <EmptyNote>Không có câu nào thuộc nhóm này.</EmptyNote>
            ) : (
              <ClaimGroup status={filter} claims={filteredClaims} forceOpen={true} />
            )}
          </>
        )}
      </Section>

      <Section title="Kiểm tra văn nói">
        <ul className="grid gap-2 sm:grid-cols-2">
          {LINTER_FLAGS.map((flag) => {
            const found = report.oralLinter[flag.key];
            return (
              <li
                key={flag.key}
                className={cn(
                  "flex min-h-8 items-center gap-2 text-sm font-semibold",
                  TONE_TEXT_CLASS[found ? "danger" : "success"],
                )}
              >
                {found ? (
                  <XCircle size={16} weight="fill" aria-hidden={true} />
                ) : (
                  <CheckCircle size={16} weight="fill" aria-hidden={true} />
                )}
                {found ? flag.bad : flag.ok}
              </li>
            );
          })}
        </ul>
        {report.oralLinter.errorDetails.length > 0 ? <BulletList items={report.oralLinter.errorDetails} /> : null}
      </Section>
    </div>
  );
}

type FactCheckerPanelProps = {
  output: unknown;
  /** The ORALIZER version on the same branch as the viewed report; null when it cannot be found. */
  oralized: StepVersion | null;
  workflowId?: number;
  step?: WorkflowStep;
  interactive?: boolean;
  editing?: boolean;
  onExitEdit?: () => void;
  onRequestRerun?: (stepType: StepType, prefillFeedback?: string) => void;
  onConflict?: () => void;
};

/** Gate 2: spoken script on the left, review report (or JSON editor) on the right. */
export function FactCheckerPanel({
  output,
  oralized,
  workflowId,
  step,
  interactive = false,
  editing = false,
  onExitEdit,
  onRequestRerun,
  onConflict,
}: FactCheckerPanelProps) {
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <section aria-label="Văn nói 3 tập" className="min-w-0">
        {oralized ? (
          <OralizerPanel output={oralized.outputJson} />
        ) : (
          <Callout tone="attention" title="Chưa tìm thấy văn nói tương ứng" role="status">
            Không xác định được bản văn nói cùng nhánh với báo cáo này.
          </Callout>
        )}
      </section>
      <section aria-label="Báo cáo kiểm định" className="min-w-0">
        {editing && workflowId !== undefined && step !== undefined && onExitEdit && onConflict ? (
          <FallbackJsonEditor
            workflowId={workflowId}
            step={step}
            output={output}
            onSaved={onExitEdit}
            onCancel={onExitEdit}
            onConflict={onConflict}
          />
        ) : (
          <ParsedOutput schema={STEP_OUTPUT_SCHEMAS.FACT_CHECKER} output={output}>
            {(report) => (
              <ReportView
                report={report}
                interactive={interactive}
                onRequestRerun={onRequestRerun}
              />
            )}
          </ParsedOutput>
        )}
      </section>
    </div>
  );
}
