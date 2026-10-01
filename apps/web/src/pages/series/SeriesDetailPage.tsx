import { useParams } from "react-router";
import { PageState } from "../../shared/components/PageState";

export function SeriesDetailPage() {
  const { slug } = useParams();

  return (
    <PageState
      eyebrow="Series"
      title="Chi tiết series"
      description={`Nội dung của series “${slug ?? ""}” sẽ được kết nối ở bước phát triển catalog.`}
    />
  );
}
