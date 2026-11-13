import { useQuery } from "@tanstack/react-query";
import { quizService } from "../services/quizService";

export function useQuizSeriesDetail(id: string) {
  return useQuery({ queryKey: ["quiz", "series", id], queryFn: () => quizService.seriesDetail(id), enabled: Boolean(id) });
}
