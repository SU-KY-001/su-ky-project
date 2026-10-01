import { BookOpen } from "lucide-react";
import { PageState } from "../../shared/components/PageState";

export function SeriesCatalogPlaceholder() {
  return (
    <PageState
      eyebrow="Thư viện podcast"
      title="Danh mục series"
      description="Các series lịch sử sẽ được sắp xếp theo thời kỳ và chủ đề tại đây."
      icon={<BookOpen className="size-5" aria-hidden="true" />}
    />
  );
}
