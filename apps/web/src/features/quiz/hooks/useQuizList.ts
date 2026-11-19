import { useQuery } from "@tanstack/react-query";
import { quizService } from "../services/quizService";

export function useQuizList() {
  return useQuery({ queryKey: ["quiz", "list"], queryFn: quizService.list });
}
