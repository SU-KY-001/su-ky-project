import { VoiceJobSchema, type CreateVoiceJobInput } from "@repo/shared";
import { z } from "zod";
import { ApiError } from "@/lib/apiError";
import { client } from "@/lib/client";
import { parse } from "../services/podcastProductionService";

const voice = client.api.studio.episodes[":id"].ai.voice;

/** Voice generation is a background job on the server: start it, poll it, then download the mp3. */
export const voiceService = {
  start: (id: string, json: CreateVoiceJobInput) => parse(voice.$post({ param: { id }, json }), VoiceJobSchema),
  get: (id: string, jobId: string, signal: AbortSignal) => parse(voice[":jobId"].$get({ param: { id, jobId } }, { init: { signal } }), VoiceJobSchema),
  cancel: (id: string, jobId: string) => parse(voice[":jobId"].$delete({ param: { id, jobId } }), z.undefined()),
  async audio(id: string, jobId: string, signal: AbortSignal): Promise<Blob> {
    const response = await voice[":jobId"].audio.$get({ param: { id, jobId } }, { init: { signal } });
    if (!response.ok) throw await ApiError.fromResponse(response);
    return response.blob();
  },
};
