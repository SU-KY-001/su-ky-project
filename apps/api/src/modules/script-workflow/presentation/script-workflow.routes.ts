import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { ZodError } from "zod";
import {
  CreatePublicationRequestSchema,
  CreateScriptWorkflowRequestSchema,
  ListScriptWorkflowsQuerySchema,
  ScriptWorkflowIdParamSchema,
  StepDecisionRequestSchema,
  WorkflowEventStreamQuerySchema,
  WorkflowEventsQuerySchema,
} from "@repo/shared";
import { throwOnInvalid } from "../../../core/middleware";
import { logger } from "../../../core/logger";
import { requireAuth, requireRole } from "../../auth";
import type { AppEnv } from "../../../types";
import type { WorkflowCommandService, TransitionResult } from "../application/workflow-command.service";
import { PublicationError } from "../application/publication.service";
import type { WorkflowQueryService } from "../application/workflow-query.service";
import {
  SSE_BATCH_LIMIT,
  SSE_HEARTBEAT_MS,
  SSE_POLL_INTERVAL_MS,
} from "../script-workflow.constants";

export interface ScriptWorkflowRouteDeps {
  commands: WorkflowCommandService;
  queries: WorkflowQueryService;
  isAiReady: () => boolean;
}

const WORKFLOW_NOT_FOUND_MESSAGE = "Workflow not found";
const TERMINAL_RUN_STATUSES = ["COMPLETED", "FAILED"];

function meta(c: Context<AppEnv>, extra: Record<string, unknown> = {}) {
  return { requestId: c.get("requestId") ?? "unknown", timestamp: new Date().toISOString(), ...extra };
}

/** Unwraps a failed TransitionResult into the error the global handler renders. */
function throwTransitionFailure(result: Extract<TransitionResult, { success: false }>): never {
  if (result.details instanceof ZodError) throw result.details;
  throw new HTTPException(result.status, { message: result.error });
}

/**
 * Moderator-only endpoints. Admins are excluded on purpose (BR-22: Admin does not
 * edit scripts). A run owned by someone else answers 404, never 403, so ids are not leaked.
 */
export function createScriptWorkflowRoute({ commands, queries, isAiReady }: ScriptWorkflowRouteDeps) {
  const requireUserId = (session: AppEnv["Variables"]["session"]): string => {
    if (!session) throw new HTTPException(401, { message: "Authentication required" });
    return session.user.id;
  };

  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator"))

    .post(
      "/",
      zValidator("json", CreateScriptWorkflowRequestSchema, throwOnInvalid),
      async (c) => {
        if (!isAiReady()) {
          throw new HTTPException(503, { message: "AI runtime not ready" });
        }
        const userId = requireUserId(c.get("session"));
        const { topic } = c.req.valid("json");
        const id = await commands.createRun(topic, userId);
        return c.json({ success: true as const, data: { id }, meta: meta(c) }, 201);
      }
    )

    .get("/", zValidator("query", ListScriptWorkflowsQuerySchema, throwOnInvalid), async (c) => {
      const userId = requireUserId(c.get("session"));
      const { page, limit } = c.req.valid("query");
      const { data, total } = await queries.listRuns(userId, page, limit);
      return c.json({ success: true as const, data, meta: meta(c, { page, limit, total }) });
    })

    .get("/:id", zValidator("param", ScriptWorkflowIdParamSchema, throwOnInvalid), async (c) => {
      const run = await queries.requireOwnedRun(
        c.req.valid("param").id,
        requireUserId(c.get("session"))
      );
      if (!run) throw new HTTPException(404, { message: WORKFLOW_NOT_FOUND_MESSAGE });
      return c.json({ success: true as const, data: await queries.getDetail(run), meta: meta(c) });
    })

    .get(
      "/:id/tree",
      zValidator("param", ScriptWorkflowIdParamSchema, throwOnInvalid),
      async (c) => {
        const run = await queries.requireOwnedRun(
          c.req.valid("param").id,
          requireUserId(c.get("session"))
        );
        if (!run) throw new HTTPException(404, { message: WORKFLOW_NOT_FOUND_MESSAGE });
        return c.json({ success: true as const, data: await queries.getTree(run), meta: meta(c) });
      }
    )

    .post(
      "/:id/step-decisions",
      zValidator("param", ScriptWorkflowIdParamSchema, throwOnInvalid),
      zValidator("json", StepDecisionRequestSchema, throwOnInvalid),
      async (c) => {
        const userId = requireUserId(c.get("session"));
        const run = await queries.requireOwnedRun(c.req.valid("param").id, userId);
        if (!run) throw new HTTPException(404, { message: WORKFLOW_NOT_FOUND_MESSAGE });

        const decision = c.req.valid("json");
        switch (decision.action) {
          case "CONTINUE": {
            const result = await commands.continueStep({
              workflowRunId: run.id,
              stepType: decision.stepType,
              version: decision.baseVersion,
              userId,
              incomingGuidance: decision.incomingGuidance,
              narrativeSelection: decision.narrativeSelection,
            });
            if (!result.success) throwTransitionFailure(result);
            return c.json({
              success: true as const,
              data: { stepType: decision.stepType, action: decision.action, ...result.data },
              meta: meta(c),
            });
          }
          case "RERUN": {
            const result = await commands.rerunStep({
              workflowRunId: run.id,
              stepType: decision.stepType,
              feedback: decision.feedback,
            });
            if (!result.success) throwTransitionFailure(result);
            return c.json({
              success: true as const,
              data: { stepType: decision.stepType, action: decision.action },
              meta: meta(c),
            });
          }
          case "DIRECT_EDIT": {
            const result = await commands.directEditStep({
              workflowRunId: run.id,
              stepType: decision.stepType,
              baseVersion: decision.baseVersion,
              editedOutputJson: decision.editedOutputJson,
              note: decision.note,
            });
            if (!result.success) throwTransitionFailure(result);
            return c.json({
              success: true as const,
              data: { stepType: decision.stepType, action: decision.action, ...result.data },
              meta: meta(c),
            });
          }
        }
      }
    )

    .get(
      "/:id/publications",
      zValidator("param", ScriptWorkflowIdParamSchema, throwOnInvalid),
      async (c) => {
        const run = await queries.requireOwnedRun(
          c.req.valid("param").id,
          requireUserId(c.get("session"))
        );
        if (!run) throw new HTTPException(404, { message: WORKFLOW_NOT_FOUND_MESSAGE });
        return c.json({
          success: true as const,
          data: await queries.listPublications(run.id),
          meta: meta(c),
        });
      }
    )

    .post(
      "/:id/publications",
      zValidator("param", ScriptWorkflowIdParamSchema, throwOnInvalid),
      zValidator("json", CreatePublicationRequestSchema, throwOnInvalid),
      async (c) => {
        const userId = requireUserId(c.get("session"));
        const run = await queries.requireOwnedRun(c.req.valid("param").id, userId);
        if (!run) throw new HTTPException(404, { message: WORKFLOW_NOT_FOUND_MESSAGE });

        try {
          const publication = await commands.publish(
            run.id,
            c.req.valid("json").approvedVersionId,
            userId
          );
          return c.json(
            { success: true as const, data: { publicationId: publication.id }, meta: meta(c) },
            201
          );
        } catch (err) {
          if (err instanceof PublicationError) {
            throw new HTTPException(400, { message: err.message });
          }
          throw err;
        }
      }
    )

    .get(
      "/:id/events",
      zValidator("param", ScriptWorkflowIdParamSchema, throwOnInvalid),
      zValidator("query", WorkflowEventsQuerySchema, throwOnInvalid),
      async (c) => {
        const run = await queries.requireOwnedRun(
          c.req.valid("param").id,
          requireUserId(c.get("session"))
        );
        if (!run) throw new HTTPException(404, { message: WORKFLOW_NOT_FOUND_MESSAGE });
        const { type, limit } = c.req.valid("query");
        return c.json({
          success: true as const,
          data: await queries.listEvents(run.id, type, limit),
          meta: meta(c),
        });
      }
    )

    /**
     * SSE pushes only new rows (cursor afterId) and closes when the run is terminal;
     * EventSource reconnects with Last-Event-ID. Cookie auth: the client must use
     * `withCredentials: true`.
     */
    .get(
      "/:id/events/stream",
      zValidator("param", ScriptWorkflowIdParamSchema, throwOnInvalid),
      zValidator("query", WorkflowEventStreamQuerySchema, throwOnInvalid),
      async (c) => {
        const run = await queries.requireOwnedRun(
          c.req.valid("param").id,
          requireUserId(c.get("session"))
        );
        if (!run) throw new HTTPException(404, { message: WORKFLOW_NOT_FOUND_MESSAGE });

        const headerCursor = Number(c.req.header("last-event-id") ?? 0);
        let afterId =
          c.req.valid("query").afterId ??
          (Number.isInteger(headerCursor) && headerCursor > 0 ? headerCursor : 0);
        const workflowRunId = run.id;

        return streamSSE(c, async (stream) => {
          const heartbeat = setInterval(() => {
            void stream.writeSSE({ event: "ping", data: "keepalive" });
          }, SSE_HEARTBEAT_MS);
          try {
            while (!stream.closed && !stream.aborted) {
              const events = await queries.listEventsAfter(workflowRunId, afterId, SSE_BATCH_LIMIT);
              for (const event of events) {
                afterId = event.id;
                await stream.writeSSE({
                  event: "workflow-event",
                  id: String(event.id),
                  data: JSON.stringify(event),
                });
              }

              const status = await queries.getRunStatus(workflowRunId);
              if (status && TERMINAL_RUN_STATUSES.includes(status)) {
                await stream.writeSSE({
                  event: "workflow-done",
                  data: JSON.stringify({ workflowRunId, status }),
                });
                break;
              }
              await stream.sleep(SSE_POLL_INTERVAL_MS);
            }
          } catch (err) {
            logger.warn({ err, workflowRunId }, "SSE stream ended with error");
          } finally {
            clearInterval(heartbeat);
          }
        });
      }
    );
}
