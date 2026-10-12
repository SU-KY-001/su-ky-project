import { Link } from "react-router";
import { ArrowLeft } from "@phosphor-icons/react";
import { ModeratorShell } from "@/features/moderator/components/ModeratorShell";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { SCRIPT_WORKFLOWS_PATH, scriptWorkflowPageNav } from "@/features/moderator/navItems";
import { CreateWorkflowForm } from "@/features/script-workflow/components/create/CreateWorkflowForm";

export function ScriptWorkflowCreatePage() {
  return (
    <ModeratorShell nav={scriptWorkflowPageNav()} breadcrumb="Tạo kịch bản" subtitle="Tạo kịch bản podcast mới">
      <div className="flex w-full flex-col gap-5">
        <Link
          to={SCRIPT_WORKFLOWS_PATH}
          className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-mod-primary-hover no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"
        >
          <ArrowLeft size={16} weight="bold" aria-hidden={true} />
          Danh sách kịch bản
        </Link>
        <section className="flex flex-col gap-5 rounded-[16px] border border-mod-border bg-mod-surface p-5 sm:p-6">
          <ModeratorText as="h1" className="text-2xl font-extrabold tracking-tight text-mod-text">Tạo kịch bản podcast</ModeratorText>
          <CreateWorkflowForm />
        </section>
      </div>
    </ModeratorShell>
  );
}
