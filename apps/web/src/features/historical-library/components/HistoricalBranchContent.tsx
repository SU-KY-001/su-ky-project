import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { catalogKeys } from "../hooks/useHistoricalCatalog";
import { historicalCatalogService as api, type HistoricalKind } from "../services/historicalCatalogService";
import type { HistoricalNodeDto } from "./CreateHistoricalContentDialog";
import { LibraryStatusBadge } from "./LibraryStatusBadge";

export function HistoricalBranchContent({ kind, node }: { kind: HistoricalKind; node: HistoricalNodeDto }): ReactElement {
  const citations = useQuery({
    queryKey: [...catalogKeys.root, "citations", kind, node.id],
    queryFn: () => api.citations(kind, node.id),
  });
  return (
    <section aria-label="Chi tiết nội dung" className="space-y-2 text-sm">
      {node.summary ? <p className="whitespace-pre-wrap break-words leading-6 text-mod-text">{node.summary}</p> : null}
      {node.deletedAt ? <p className="text-mod-danger">Nội dung đã được đưa vào thùng rác.</p> : null}
      {node.warnings.map((warning) => <p key={warning} className="text-mod-attention">{warning === "TIME_OUTSIDE_PARENT" ? "Mốc thời gian nằm ngoài khoảng của nhánh cha." : warning}</p>)}
      {node.sourceCount > 0 || node.podcastCount > 0 || "displayStatus" in node ? <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-mod-text-secondary">
        {node.sourceCount > 0 ? <span>{node.sourceCount} nguồn tư liệu</span> : null}
        {node.podcastCount > 0 ? <span>{node.podcastCount} podcast liên kết</span> : null}
        {"displayStatus" in node ? <LibraryStatusBadge compact status={node.displayStatus === "COMPLETE" ? "complete" : node.displayStatus === "MISSING_SOURCE" ? "missing_source" : node.displayStatus === "DRAFT" ? "draft" : "needs_review"} /> : null}
      </div> : null}
      {"aliases" in node && node.aliases.length ? <p>Tên khác: {node.aliases.join(" · ")}</p> : null}
      {"reviewNote" in node && node.reviewNote ? <p className="whitespace-pre-wrap break-words">Nhận xét kiểm duyệt: {node.reviewNote}</p> : null}
      <section aria-label={"Nguồn tư liệu của " + node.name} className="space-y-3">
        {citations.data?.items.length ? <p className="font-semibold">Nguồn tư liệu</p> : null}
        {citations.isPending ? <p className="text-mod-text-secondary">Đang tải nguồn tư liệu…</p>
          : citations.error ? <div role="alert" className="space-y-2 text-mod-danger"><p>{citations.error.message}</p><Button variant="outline" onClick={() => { void citations.refetch(); }}>Thử lại</Button></div>
          : citations.data.items.length === 0 ? <p className="text-xs text-mod-text-secondary">Chưa có nguồn tư liệu.</p>
          : <ol className="space-y-4">{citations.data.items.map((citation) => (
            <li key={citation.id} className="space-y-2 border-l border-mod-border pl-4">
              <p className="font-semibold">{citation.source.title}</p>
              <p className="text-mod-text-secondary">{[citation.source.author, citation.source.publisher, citation.source.edition, citation.source.publicationYear].filter(Boolean).join(" · ")}</p>
              <p>{citation.locator}</p>
              {citation.excerpt ? <blockquote className="whitespace-pre-wrap break-words leading-6">{citation.excerpt}</blockquote> : null}
              {citation.note ? <p className="whitespace-pre-wrap break-words">Ghi chú: {citation.note}</p> : null}
              <p className="text-xs text-mod-text-secondary">{citation.source.verificationStatus === "VERIFIED" ? "Đã xác minh" : citation.source.verificationStatus === "REJECTED" ? "Bị từ chối" : "Chưa xác minh"} · Phiên bản {citation.sourceVersion}{citation.outdated ? " · Nguồn đã có phiên bản mới" : ""}</p>
              <div className="flex flex-wrap gap-4">
                {citation.source.url ? <a className="break-all text-mod-primary underline" href={citation.source.url} target="_blank" rel="noopener noreferrer">Xem nguồn gốc</a> : null}
                {citation.source.file ? <a className="text-mod-primary underline" href={citation.source.file.url} target="_blank" rel="noopener noreferrer">Xem tài liệu PDF</a> : null}
              </div>
            </li>
          ))}</ol>}
      </section>
    </section>
  );
}
