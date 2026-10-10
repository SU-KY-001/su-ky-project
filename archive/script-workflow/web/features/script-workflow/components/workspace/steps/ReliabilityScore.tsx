import { ModeratorText } from "@/features/moderator/components/ModeratorText";

const MAX_RELIABILITY_SCORE = 10;
const PERCENT = 100;

/** Reliability 1..10 as a bar plus the number, so the value never depends on the bar alone. */
export function ReliabilityScore({ score }: { score: number }) {
  const width = Math.min(PERCENT, Math.max(0, (score / MAX_RELIABILITY_SCORE) * PERCENT));
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`Điểm tin cậy ${score} trên ${MAX_RELIABILITY_SCORE}`}>
      <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-mod-canvas-accent" aria-hidden={true}>
        <div className="h-full rounded-full bg-mod-primary" style={{ width: `${width}%` }} />
      </div>
      <ModeratorText className="text-sm font-bold tabular-nums text-mod-text" aria-hidden={true}>
        {score}/{MAX_RELIABILITY_SCORE}
      </ModeratorText>
    </div>
  );
}
