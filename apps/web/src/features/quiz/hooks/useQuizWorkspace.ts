import { useQuery } from "@tanstack/react-query";
import { quizService } from "../services/quizService";

export function useQuizWorkspace(episodeId: string, refreshOnOpen = false) {
  return useQuery({ queryKey: ["quiz", "workspace", episodeId], queryFn: () => quizService.read(episodeId), enabled: Boolean(episodeId), refetchInterval: 30_000, refetchOnMount: refreshOnOpen ? "always" : undefined });
}
