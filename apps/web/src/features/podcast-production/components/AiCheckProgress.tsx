import type { ReactElement } from "react";
import type { AiCheck } from "@repo/shared";
import { AiRunStatus } from "../ai/AiRunStatus";
import type { AiLogEntry } from "../ai/aiRunLog";
import { AI_RUN_TEXT } from "../ai/aiRunMessages";

interface Props {
  check: Pick<AiCheck, "processedBlocks" | "totalBlocks" | "failedBlocks">;
  found: number;
  log: AiLogEntry[];
  startedAt: number;
  onCancel?: () => void;
}

export function AiCheckProgress({ check, found, log, startedAt, onCancel }: Props): ReactElement {
  return (
    <AiRunStatus
      title={AI_RUN_TEXT.checkTitle}
      step={AI_RUN_TEXT.stepSummary(check.processedBlocks, check.totalBlocks, found, check.failedBlocks)}
      done={check.processedBlocks}
      total={check.totalBlocks}
      log={log}
      startedAt={startedAt}
      hint={AI_RUN_TEXT.keepTyping}
      onCancel={onCancel}
    />
  );
}
