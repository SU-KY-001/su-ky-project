import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QuizWorkspace } from "@repo/shared";
import { quizService } from "../services/quizService";

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
  };
}
