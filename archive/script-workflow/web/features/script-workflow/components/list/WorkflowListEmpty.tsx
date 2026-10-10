import { Link } from "react-router";
import { FilePlus, Scroll } from "@phosphor-icons/react";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { NEW_WORKFLOW_PATH } from "../../constants";

const EMPTY_ICON_SIZE = 40;

export function WorkflowListEmpty() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-mod-border bg-mod-surface px-6 py-12 text-center">
      <Scroll size={EMPTY_ICON_SIZE} className="text-mod-text-low" aria-hidden={true} />
      <ModeratorText as="h2" className="text-base font-extrabold text-mod-text">Chưa có kịch bản nào</ModeratorText>
      <ModeratorText className="max-w-[360px] text-sm text-mod-text-secondary">
        Nhập một chủ đề lịch sử, trợ lý biên tập sẽ soạn kịch bản podcast 3 tập để bạn duyệt.
      </ModeratorText>
      <Link
        to={NEW_WORKFLOW_PATH}
        className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-4 text-sm font-bold text-white no-underline hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"
      >
        <FilePlus size={18} weight="bold" aria-hidden={true} />
        Tạo kịch bản mới
      </Link>
    </div>
  );
}
