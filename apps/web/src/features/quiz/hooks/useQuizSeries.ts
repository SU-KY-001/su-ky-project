import { useInfiniteQuery } from "@tanstack/react-query";
import { quizService } from "../services/quizService";

export function useQuizSeries() {
  return useInfiniteQuery({ queryKey: ["quiz", "series"], queryFn: ({ pageParam }) => quizService.series(pageParam), initialPageParam: 1,
    getNextPageParam: page => page.page * page.limit < page.total ? page.page + 1 : undefined });
}
