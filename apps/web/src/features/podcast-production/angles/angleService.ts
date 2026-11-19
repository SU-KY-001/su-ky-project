import { AngleListSchema, AngleSchema, type CreateAngleInput, type UpdateAngleInput } from "@repo/shared";
import { z } from "zod";
import { client } from "@/lib/client";
import { parse } from "../services/podcastProductionService";

const angles = client.api.studio.ai.angles;

export const angleService = {
  list: (signal?: AbortSignal) => parse(angles.$get({}, { init: { signal } }), AngleListSchema),
  create: (json: CreateAngleInput) => parse(angles.$post({ json }), AngleSchema),
  update: (id: string, json: UpdateAngleInput) => parse(angles[":id"].$patch({ param: { id }, json }), AngleSchema),
  remove: (id: string) => parse(angles[":id"].$delete({ param: { id } }), z.undefined()),
};
