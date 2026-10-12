import { z } from "zod";
import {
  CreateScriptWorkflowResponseSchema,
  GetWorkflowEventsResponseSchema,
  GetWorkflowResponseSchema,
  ScriptPublicationSchema,
  ScriptWorkflowSummarySchema,
  StepTypeSchema,
  SystemHealthSchema,
  WorkflowTreeResponseSchema,
  paginatedSchema,
  type CreateScriptWorkflowRequest,
  type StepDecisionRequest,
} from "@repo/shared";
import { apiRequest } from "@/lib/apiRequest";
import { apiUrl } from "@/lib/client";

const BASE_PATH = "/api/script-workflows";

const WorkflowListSchema = paginatedSchema(ScriptWorkflowSummarySchema);
const PublicationListSchema = z.object({ items: z.array(ScriptPublicationSchema) });
const CreatePublicationResponseSchema = z.object({ publicationId: z.number().int().positive() });

/** Response of POST step-decisions; the fields present depend on the action. */
export const StepDecisionResponseSchema = z.object({
  stepType: StepTypeSchema,
  action: z.enum(["CONTINUE", "RERUN", "DIRECT_EDIT"]),
  nextStep: StepTypeSchema.nullable().optional(),
  publicationId: z.number().int().positive().optional(),
  newVersion: z.number().int().positive().optional(),
});

export type StepDecisionResponse = z.infer<typeof StepDecisionResponseSchema>;

export function listWorkflows(page: number, limit: number) {
  return apiRequest(`${BASE_PATH}?page=${page}&limit=${limit}`, WorkflowListSchema);
}

export function getWorkflow(id: number) {
  return apiRequest(`${BASE_PATH}/${id}`, GetWorkflowResponseSchema);
}

export function getWorkflowTree(id: number) {
  return apiRequest(`${BASE_PATH}/${id}/tree`, WorkflowTreeResponseSchema);
}

export function getWorkflowEvents(id: number, limit: number) {
  return apiRequest(`${BASE_PATH}/${id}/events?limit=${limit}`, GetWorkflowEventsResponseSchema);
}

export function listPublications(id: number) {
  return apiRequest(`${BASE_PATH}/${id}/publications`, PublicationListSchema);
}

export function createWorkflow(request: CreateScriptWorkflowRequest, idempotencyKey: string) {
  return apiRequest(BASE_PATH, CreateScriptWorkflowResponseSchema, { method: "POST", body: request, idempotencyKey });
}

export function sendStepDecision(id: number, decision: StepDecisionRequest, idempotencyKey: string) {
  return apiRequest(`${BASE_PATH}/${id}/step-decisions`, StepDecisionResponseSchema, {
    method: "POST",
    body: decision,
    idempotencyKey,
  });
}

export function createPublication(id: number, approvedVersionId: number, idempotencyKey: string) {
  return apiRequest(`${BASE_PATH}/${id}/publications`, CreatePublicationResponseSchema, {
    method: "POST",
    body: { approvedVersionId },
    idempotencyKey,
  });
}

/**
 * /health answers 503 when the DB or queue is down but the body still carries `ai`,
 * so the body is read for both 200 and 503 instead of going through apiRequest.
 */
export async function getHealth() {
  const response = await fetch(`${apiUrl}/health`, { credentials: "include" });
  return SystemHealthSchema.parse(await response.json());
}

export function workflowStreamUrl(id: number): string {
  return `${apiUrl}${BASE_PATH}/${id}/events/stream`;
}
