import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { Button } from "@/shared/components/ui/button";
import { libraryService } from "../services/libraryService";
import { LibrarySection, LibraryState } from "./library/LibraryPrimitives";

export function ExhibitionSection(): ReactElement {
  const list = useQuery({ queryKey: ["public-exhibitions"], queryFn: ({ signal }) => libraryService.exhibitions(signal), staleTime: 60000 });
  return <LibrarySection id="library-exhibitions" title="Triển lãm lịch sử 3D" description="Khám phá những câu chuyện lịch sử qua các triển lãm ảnh tư liệu trong không gian 3D.">
    {list.isPending ? <LibraryState loading /> : list.isError ? <LibraryState error title="Chưa tải được danh sách triển lãm" retry={() => { void list.refetch(); }} /> : !list.data.items.length ? <LibraryState title="Chưa có triển lãm được công khai" description="Mời bạn quay lại để khám phá những triển lãm sắp tới." /> : <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {list.data.items.map(item => <li key={item.slug} className="flex min-w-0 flex-col border-l-2 border-bronze/50 bg-paper/50 p-5">
        <h3 className="break-words text-lg font-semibold leading-7">{item.title}</h3>
        <p className="mb-5 mt-3 line-clamp-3 text-sm leading-7 text-ink-soft">{item.description}</p>
        <Button asChild variant="link" className="mt-auto self-start px-0"><Link to={`/trien-lam/${encodeURIComponent(item.slug)}`} aria-label={`Tham quan: ${item.title}`}>Tham quan <ArrowRight aria-hidden="true" /></Link></Button>
      </li>)}
    </ul>}
  </LibrarySection>;
}
