import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { ExhibitionExperience, publicExhibition } from "@/features/exhibition/public";
import { ErrorState } from "@/shared/components/common/ErrorState";
import { Button } from "@/shared/components/ui/button";
import { APP_PATHS } from "@/shared/constants/routes";

export function ExhibitionPage() {
  const { slug = "" } = useParams();
  const query = useQuery({ queryKey: ["public-exhibition", slug], queryFn: ({ signal }) => publicExhibition(slug, signal), enabled: !!slug });
  if (query.isPending) return <p role="status">Đang tải triển lãm…</p>;
  if (query.isError) return <ErrorState title="Không thể tải triển lãm" description="Không tìm thấy hoặc không thể tải triển lãm. Vui lòng thử lại." onRetry={() => { void query.refetch(); }}><Button asChild variant="ghost"><a href={APP_PATHS.home}>Về trang chủ</a></Button></ErrorState>;
  return <ExhibitionExperience key={slug} exhibition={query.data} />;
}
