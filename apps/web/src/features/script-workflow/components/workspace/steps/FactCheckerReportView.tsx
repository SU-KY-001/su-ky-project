import { ArrowsClockwise, CheckCircle, XCircle } from "@phosphor-icons/react";
import type { ReviewReport, StepType } from "@repo/shared";
import { cn } from "@/lib/utils";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { buildScriptWriterFeedbackFromClaims, buildStoryPlannerFeedbackFromClaims } from "../gates/gateDrafts";
import { TONE_TEXT_CLASS } from "../StatusBadge";
import { FactCheckerClaimsSection } from "./FactCheckerClaimsSection";
import { BulletList, Callout, Chip, Section } from "./stepUi";

const PERCENT = 100;
const ICON_SIZE_SM = 16;

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

type FactCheckerReportViewProps = {
  report: ReviewReport;
  interactive: boolean;
  onRequestRerun?: (stepType: StepType, prefillFeedback?: string) => void;
};

/** Fact-check report: verdict, score, rerun guidance, claim groups and oral linter flags. */
export function FactCheckerReportView({ report, interactive, onRequestRerun }: FactCheckerReportViewProps) {
  const hasRedOrAmber = report.claimVerification.some(
    (claim) => claim.status === "CONTRADICTION" || claim.status === "UNSUPPORTED_SPECULATION",
  );

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
              Dàn ý giữ nguyên: chạy lại từ bước Viết kịch bản để AI sửa các câu bị gắn cờ. Chỉ quay về Dàn ý 3 tập nếu chính dàn ý sai hướng.
            </ModeratorText>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  onRequestRerun("SCRIPT_WRITER", buildScriptWriterFeedbackFromClaims(report.claimVerification))
                }
                className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-mod-primary px-3 font-moderator text-xs font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"
              >
                <ArrowsClockwise size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
                Viết lại kịch bản (giữ dàn ý)
              </button>
              <button
                type="button"
                onClick={() => onRequestRerun("FACT_CHECKER")}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
              >
                <ArrowsClockwise size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
                Kiểm định lại
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

      <FactCheckerClaimsSection claims={report.claimVerification} />

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
