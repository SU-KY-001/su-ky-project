import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "@phosphor-icons/react";
import type { GetWorkflowResponse } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { SCRIPT_WORKFLOWS_PATH } from "@/features/moderator/navItems";
import { WORKFLOW_STATUS } from "../../labels";
import { StatusBadge } from "./StatusBadge";

const ICON_SIZE_SM = 16;

type WorkspaceHeaderProps = {
  workflow: GetWorkflowResponse;
  /** Workspace tab list, rendered at the trailing edge of the title bar. */
  children: ReactNode;
};

/** Title bar: back link, workflow topic, run status, and the workspace tabs; left accent follows the run status. */
export function WorkspaceHeader({ workflow, children }: WorkspaceHeaderProps) {
  const status = WORKFLOW_STATUS[workflow.status];

  const heroAccentClass =
    workflow.status === "WAITING_FOR_HUMAN"
      ? "border-l-mod-attention"
      : workflow.status === "COMPLETED"
        ? "border-l-mod-success"
        : workflow.status === "FAILED"
          ? "border-l-mod-danger"
          : "border-l-mod-primary";

  return (
    <header
      className={`flex flex-col gap-3 rounded-[16px] border border-mod-border border-l-4 ${heroAccentClass} bg-mod-surface p-4 shadow-[0_8px_22px_rgba(15,23,42,.045)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5`}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <Link
          to={SCRIPT_WORKFLOWS_PATH}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border border-mod-border bg-mod-canvas px-3 text-xs font-extrabold text-mod-primary-hover no-underline hover:border-mod-primary hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
        >
          <ArrowLeft size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
          Danh sách
        </Link>
        <ModeratorText as="h1" className="min-w-0 flex-1 text-xl font-extrabold tracking-tight text-mod-text sm:text-2xl">
          {workflow.topic}
        </ModeratorText>
        <StatusBadge status={workflow.status} label={status.label} tone={status.tone} />
      </div>
      {children}
    </header>
  );
}
