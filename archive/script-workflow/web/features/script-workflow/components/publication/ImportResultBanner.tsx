import { Link } from "react-router";
import { ArrowSquareOut, CheckCircle } from "@phosphor-icons/react";
import type { ImportResult } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { MODERATOR_DASHBOARD_PATH } from "@/features/moderator/navItems";
import { ICON_SIZE, STATUS_ICON_SIZE } from "./StudioImportDialog";

export function ImportResultBanner({ result }: { result: ImportResult }) {
  const newSourcesCount = result.createdSourceIds.length;
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-[12px] border border-mod-success/40 bg-mod-success/10 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-mod-success">
          <CheckCircle size={STATUS_ICON_SIZE} weight="fill" aria-hidden={true} />
          <ModeratorText className="text-sm font-extrabold text-mod-success">
            Đã tạo Series và 3 tập nháp ({newSourcesCount} nguồn mới)
          </ModeratorText>
        </div>
        <Link
          to={MODERATOR_DASHBOARD_PATH}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-mod-primary px-3.5 text-xs font-bold text-white no-underline hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"
        >
          <ModeratorText>Mở trong Studio</ModeratorText>
          <ArrowSquareOut size={ICON_SIZE} aria-hidden={true} />
        </Link>
      </div>
      {result.episodes.length > 0 ? (
        <ul className="flex flex-col gap-1 pl-6 text-sm text-mod-text">
          {result.episodes.map((episode) => (
            <li key={episode.episodeId} className="list-disc">
              <ModeratorText>
                Tập {episode.episodeNo}: {episode.title}
              </ModeratorText>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
