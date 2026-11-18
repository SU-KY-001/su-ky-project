import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useParams } from "react-router";
import { ExhibitionExperience, publicExhibition } from "@/features/exhibition/public";
import { ErrorState } from "@/shared/components/common/ErrorState";
import { Button } from "@/shared/components/ui/button";
import { APP_PATHS } from "@/shared/constants/routes";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { ApiError } from "@/lib/apiError";
import { QuotaGate } from "@/features/membership/components/QuotaGate";
import { membershipService } from "@/features/membership/services/membershipService";

export function ExhibitionPage() {
  const { slug = "" } = useParams();
  const user = useCurrentUser();
  const query = useQuery({ queryKey: ["public-exhibition", slug], queryFn: ({ signal }) => publicExhibition(slug, signal), enabled: !!slug });
  const enter = useMutation({ mutationFn: (target: string) => membershipService.enterExhibition(target) });
  const entered = useRef<string | null>(null);
  // Anonymous visitors keep today's public access; the Free quota only counts signed-in accounts.
  useEffect(() => {
    if (!user.data || !query.isSuccess || !slug || entered.current === slug) return;
    entered.current = slug;
    enter.mutate(slug);
  }, [user.data, query.isSuccess, slug, enter.mutate]);
  if (query.isPending) return <p role="status">Đang tải triển lãm…</p>;
  if (query.isError) return <ErrorState title="Không thể tải triển lãm" description="Không tìm thấy hoặc không thể tải triển lãm. Vui lòng thử lại." onRetry={() => { void query.refetch(); }}><Button asChild variant="ghost"><a href={APP_PATHS.home}>Về trang chủ</a></Button></ErrorState>;
  if (enter.isError) {
    if (enter.error instanceof ApiError && enter.error.errorCode === "DAILY_QUOTA_EXHAUSTED")
      return <QuotaGate title="Hết lượt triển lãm hôm nay" description={enter.error.message} />;
    return <ErrorState title="Chưa mở được triển lãm" description="Vui lòng thử lại." onRetry={() => { entered.current = null; enter.mutate(slug); }}><Button asChild variant="ghost"><a href={APP_PATHS.home}>Về trang chủ</a></Button></ErrorState>;
  }
  if (user.data && !enter.isSuccess) return <p role="status">Đang mở triển lãm…</p>;
  return <ExhibitionExperience key={slug} exhibition={query.data} />;
}
