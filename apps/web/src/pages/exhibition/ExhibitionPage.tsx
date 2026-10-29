import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { ExhibitionExperience, publicExhibition } from "@/features/exhibition/public";
import { Button } from "@/shared/components/ui/button";

export function ExhibitionPage() {
  const { slug = "" } = useParams();
  const query = useQuery({ queryKey: ["public-exhibition", slug], queryFn: ({ signal }) => publicExhibition(slug, signal), enabled: !!slug });
  if (query.isPending) return <p role="status">Đang tải triển lãm…</p>;
  if (query.isError) return <div role="alert"><p>Không tìm thấy hoặc không thể tải triển lãm.</p><Button onClick={() => void query.refetch()}>Thử lại</Button></div>;
  return <ExhibitionExperience key={slug} exhibition={query.data} />;
}
