import { useParams } from "react-router";
import { CitationPanelPlaceholder } from "../../features/citations/CitationPanelPlaceholder";
import { EpisodeTranscriptPlaceholder } from "../../features/episode-detail/EpisodeTranscriptPlaceholder";
import { PageState } from "../../shared/components/PageState";

export function EpisodePage() {
  const { slug } = useParams();

  return (
    <div className="space-y-6">
      <PageState
        eyebrow="Chi tiết tập"
        title="Nội dung tập podcast"
        description={`Tập “${slug ?? ""}” sẽ hiển thị thông tin, bản chép lời và trình phát tại đây.`}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <EpisodeTranscriptPlaceholder />
        <CitationPanelPlaceholder />
      </div>
    </div>
  );
}
