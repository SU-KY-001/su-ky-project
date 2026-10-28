import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { quizService } from "./quizService";
import type { QuizWorkspace } from "@repo/shared";
export function useQuizList() {
  return useQuery({ queryKey: ["quiz", "list"], queryFn: quizService.list });
}
export function useQuizWorkspace(episodeId: string) {
  return useQuery({ queryKey: ["quiz", "workspace", episodeId], queryFn: () => quizService.read(episodeId), enabled: Boolean(episodeId), refetchInterval: 30_000 });
}
export function useQuizScript(episodeId: string, scriptHash: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["quiz", "script", episodeId, scriptHash],
    queryFn: () => quizService.script(episodeId),
    enabled: Boolean(scriptHash) && enabled,
    staleTime: 30_000,
  });
}
export function useQuizSeries() {
  return useInfiniteQuery({ queryKey: ["quiz", "series"], queryFn: ({ pageParam }) => quizService.series(pageParam), initialPageParam: 1,
    getNextPageParam: p => p.page * p.limit < p.total ? p.page + 1 : undefined });
}
export function useQuizSeriesDetail(id: string) {
  return useQuery({ queryKey: ["quiz", "series", id], queryFn: () => quizService.seriesDetail(id), enabled: Boolean(id) });
}
export function useQuizMutations() {
  const client = useQueryClient();
  const onSuccess = async (workspace: QuizWorkspace): Promise<void> => {
    await client.cancelQueries({ queryKey: ["quiz", "workspace", workspace.episodeId] });
    client.setQueryData(["quiz", "workspace", workspace.episodeId], workspace);
    await client.invalidateQueries({ queryKey: ["quiz", "list"] });
  };
  return {
    save: useMutation({ mutationFn: (input: Parameters<typeof quizService.save>) => quizService.save(...input), onSuccess }),
    activate: useMutation({ mutationFn: (input: Parameters<typeof quizService.activate>) => quizService.activate(...input), onSuccess }),
    generate: useMutation({ mutationFn: (input: Parameters<typeof quizService.generate>) => quizService.generate(...input) }),
  };
}
