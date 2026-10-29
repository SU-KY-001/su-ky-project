import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { ExhibitionExperience } from "@/features/exhibition";
import { exhibitionService } from "@/features/exhibition-editor";
import { Button } from "@/shared/components/ui/button";

export function ExhibitionPage() {
  const { slug = "" } = useParams();
  const query = useQuery({ queryKey: ["public-exhibition", slug], queryFn: () => exhibitionService.publicExhibition(slug), enabled: !!slug });
  if (query.isPending) return <p role="status">Đang tải triển lãm…</p>;
  if (query.isError) return <div role="alert"><p>Không tìm thấy hoặc không thể tải triển lãm.</p><Button onClick={() => void query.refetch()}>Thử lại</Button></div>;
  return <ExhibitionExperience exhibition={query.data} />;
}
