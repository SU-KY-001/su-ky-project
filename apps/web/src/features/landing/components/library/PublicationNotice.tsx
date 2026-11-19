import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PublicPublicationInfo } from "@repo/shared";
import { libraryService } from "../../services/libraryService";

/** Disclosure and credits the approver recorded for the published version; nothing renders when neither was given. */
export function PublicationNoticeView({ info }: { info: PublicPublicationInfo | null | undefined }): ReactElement | null {
  if (!info || (!info.aiDisclosure && !info.credits)) return null;
  return (
    <section aria-label="Thông tin về tập này" className="space-y-2 rounded-lg border border-line bg-paper p-3 text-xs leading-6 text-ink-soft">
      {info.aiDisclosure ? <p><strong className="text-ink">Thông báo về AI: </strong><span className="whitespace-pre-line">{info.aiDisclosure}</span></p> : null}
      {info.credits ? <p><strong className="text-ink">Ghi công: </strong><span className="whitespace-pre-line">{info.credits}</span></p> : null}
    </section>
  );
}

/** Shares the episode query key with the player and reader, so showing the notice costs no extra request. */
export function PublicationNotice({ slug }: { slug: string }): ReactElement | null {
  const detail = useQuery({ queryKey: ["library-episode", slug], queryFn: ({ signal }) => libraryService.episode(slug, signal) });
  return <PublicationNoticeView info={detail.data?.publicationInfo} />;
}
