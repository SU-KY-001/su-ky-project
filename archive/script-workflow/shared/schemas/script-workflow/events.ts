import { z } from "zod";

export const WorkflowEventSchema = z.object({
  id: z.number().int().positive(),
  type: z.string().min(1),
  message: z.string(),
  metadataJson: z.unknown(),
  createdAt: z.string(),
});

export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;

export const GetWorkflowEventsResponseSchema = z.object({
  workflowRunId: z.number().int().positive(),
  count: z.number().int().nonnegative(),
  events: z.array(WorkflowEventSchema),
});

export type GetWorkflowEventsResponse = z.infer<typeof GetWorkflowEventsResponseSchema>;

export const WorkflowEventsQuerySchema = z.object({
  type: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const WorkflowEventStreamQuerySchema = z.object({
  afterId: z.coerce.number().int().nonnegative().optional(),
});
