import { Search } from "lucide-react";
import { PageState } from "../../shared/components/PageState";

export function SearchFeaturePlaceholder() {
  return (
    <PageState
      eyebrow="Tra cứu"
      title="Tìm theo nhân vật, thời kỳ hoặc chủ đề"
      description="Công cụ tìm kiếm sẽ kết nối với kho tư liệu và các tập podcast trong bước phát triển tiếp theo."
      icon={<Search className="size-5" aria-hidden="true" />}
    />
  );
}
