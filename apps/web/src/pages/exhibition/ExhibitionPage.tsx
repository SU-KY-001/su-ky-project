import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { isApiError } from "@/lib/apiError";
import { ExhibitionExperience, publicExhibition } from "@/features/exhibition/public";
import { ErrorState } from "@/shared/components/common/ErrorState";
import { Button } from "@/shared/components/ui/button";
import { APP_PATHS } from "@/shared/constants/routes";

export function ExhibitionPage() {
  const { slug = "" } = useParams();
  return <ExhibitionVisit key={slug} slug={slug} />;
}

function ExhibitionVisit({ slug }: { slug: string }) {
  const [start] = useState(() => crypto.randomUUID());
  const query = useQuery({
    queryKey: ["public-exhibition", slug, start],
    queryFn: ({ signal }) => publicExhibition(slug, signal, start),
    enabled: Boolean(slug),
    meta: { requiresAuth: true },
    retry: (count, error) => count < 1 && (!isApiError(error) || error.isRetryable),
  });
  const queryClient = useQueryClient();
  useEffect(() => { if (query.data) void queryClient.invalidateQueries({ queryKey: ["membership", "status"] }); }, [query.data, queryClient]);
  if (query.isPending) return <p role="status">Đang tải triển lãm…</p>;
  if (isApiError(query.error) && (query.error.is("PREMIUM_REQUIRED") || query.error.is("EXPERIENCE_QUOTA_REACHED"))) return (
    <ErrorState title={query.error.is("PREMIUM_REQUIRED") ? "Triển lãm dành cho thành viên Premium" : "Bạn đã hết lượt tham quan hôm nay"} description={query.error.message}>
      <Button asChild><Link to={APP_PATHS.membership}>Xem gói Premium</Link></Button>
      <Button asChild variant="ghost"><Link to={APP_PATHS.home}>Về trang chủ</Link></Button>
    </ErrorState>
  );
  if (query.isError) return <ErrorState title="Không thể tải triển lãm" description="Không tìm thấy hoặc không thể tải triển lãm. Vui lòng thử lại." onRetry={() => { void query.refetch(); }}><Button asChild variant="ghost"><a href={APP_PATHS.home}>Về trang chủ</a></Button></ErrorState>;
  return <ExhibitionExperience key={slug} exhibition={query.data} />;
}
