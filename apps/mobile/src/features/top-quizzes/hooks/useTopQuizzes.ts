import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { TopQuizzesResponse } from "@repo/shared";
import { useAuthStore } from "@/lib/authStore";
import { topQuizzesService } from "../services/topQuizzesService";

export function useTopQuizzes(page = 1, limit = 4): UseQueryResult<TopQuizzesResponse, Error> {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({ queryKey: ["me", "top-quizzes", userId, { page, limit }], queryFn: ({ signal }) => topQuizzesService.list(page, limit, signal), enabled: Boolean(userId), staleTime: 0, retry: 1 });
}
