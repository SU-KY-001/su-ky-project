import { useQuery } from "@tanstack/react-query";
import { quizService } from "../services/quizService";

export function useQuizPoster(assetId: string | null | undefined, enabled: boolean) {
  const imagePolicy = useQuery({ queryKey: ["media", "image-upload-policy"], queryFn: quizService.imagePolicy, enabled });
  const poster = useQuery({ queryKey: ["quiz", "poster", assetId], queryFn: () => quizService.image(assetId!), enabled: Boolean(assetId) && enabled });
  return { imagePolicy, poster, uploadImage: quizService.uploadImage };
}
