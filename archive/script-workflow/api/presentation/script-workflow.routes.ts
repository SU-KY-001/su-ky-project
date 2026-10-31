import { prisma } from "@repo/db";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { ZodError } from "zod";
import {
  CreatePublicationRequestSchema,
  ImportRequestSchema,
  CreateScriptWorkflowRequestSchema,
  ListScriptWorkflowsQuerySchema,
  ScriptWorkflowIdParamSchema,
  StepDecisionRequestSchema,
  WorkflowEventStreamQuerySchema,
  WorkflowEventsQuerySchema,
} from "@repo/shared";
import { idempotency, rateLimit, throwOnInvalid } from "../../../core/middleware";
import { DomainError } from "../../../core/errors/domain-error";
import { RequestValidationError } from "../../../core/errors/request-validation-error";
import { logger } from "../../../core/logger";
import { requireAuth, requireRole } from "../../auth";
import type { AppEnv } from "../../../types";
import { assertWritable, loadSeriesForRead } from "../../content";
import type { WorkflowCommandService, TransitionResult } from "../application/workflow-command.service";
import { PublicationError } from "../application/publication.service";
import type { ContentImportService } from "../application/content-import.service";
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
  imports: ContentImportService;
}

const WORKFLOW_NOT_FOUND_MESSAGE = "Workflow not found";
const TERMINAL_RUN_STATUSES = ["COMPLETED", "FAILED"];

function throwTransitionFailure(result: Extract<TransitionResult, { success: false }>): never {
  if (result.details instanceof ZodError) throw new RequestValidationError();
  const code = result.status === 404 ? "NOT_FOUND" : result.status === 409 ? "STALE_WRITE" : "BAD_REQUEST";
  throw new DomainError(result.status, code, result.error);
}

/**
 * Moderator-only endpoints. Admins are excluded on purpose (BR-22: Admin does not
 * edit scripts). A run owned by someone else answers 404, never 403, so ids are not leaked.
 */
export function createScriptWorkflowRoute({ commands, queries, imports, isAiReady }: ScriptWorkflowRouteDeps) {
  const requireUserId = (session: AppEnv["Variables"]["session"]): string => {
    if (!session) throw new HTTPException(401, { message: "Authentication required" });
    return session.user.id;
  };

  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator"))

    .post(
      "/",
      rateLimit("write"),
      idempotency(),
      zValidator("json", CreateScriptWorkflowRequestSchema, throwOnInvalid),
      async (c) => {
        if (!isAiReady()) {
          throw new DomainError(503, "SERVICE_UNAVAILABLE", "AI runtime not ready");
        }
        const userId = requireUserId(c.get("session"));
        const input = c.req.valid("json");
        if (input.seriesId) {
          const series = await loadSeriesForRead(prisma, c.get("session")!, input.seriesId);
          assertWritable(c.get("session")!, series);
        }
        const id = await commands.createRun({ ...input, userId });
        c.header("Location", `/api/script-workflows/${id}`);
        return c.json({ id }, 201);
      }
    )

    .get("/", zValidator("query", ListScriptWorkflowsQuerySchema, throwOnInvalid), async (c) => {
      const userId = requireUserId(c.get("session"));
      const { page, limit, seriesId } = c.req.valid("query");
      const { data: items, total } = await queries.listRuns(userId, page, limit, seriesId);
      return c.json({ items, page, limit, total });
    })

    .get("/:id/import-preview", zValidator("param", ScriptWorkflowIdParamSchema, throwOnInvalid), async (c) => {
      const session = c.get("session");
      if (!session) throw new DomainError(401, "AUTH_REQUIRED", "Authentication required");
      return c.json(await imports.preview(c.req.valid("param").id, session));
    })

    .get("/:id/import", zValidator("param", ScriptWorkflowIdParamSchema, throwOnInvalid), async (c) => {
      const userId = requireUserId(c.get("session"));
      const result = await imports.imported(c.req.valid("param").id, userId);
      if (!result) throw new DomainError(404, "NOT_IMPORTED", "Workflow has not been imported");
      return c.json(result);
    })

    .post("/:id/import", rateLimit("ai_import"), idempotency(), zValidator("param", ScriptWorkflowIdParamSchema, throwOnInvalid), zValidator("json", ImportRequestSchema, throwOnInvalid), async (c) => {
      const session = c.get("session");
      if (!session) throw new DomainError(401, "AUTH_REQUIRED", "Authentication required");
      const imported = await imports.import(c.req.valid("param").id, session, c.req.valid("json"));
      c.header("Location", `/api/studio/series/${imported.result.seriesId}`);
      return c.json(imported.result, imported.created ? 201 : 200);
    })

    .get("/:id", zValidator("param", ScriptWorkflowIdParamSchema, throwOnInvalid), async (c) => {
      const run = await queries.requireOwnedRun(
        c.req.valid("param").id,
        requireUserId(c.get("session"))
      );
      if (!run) throw new HTTPException(404, { message: WORKFLOW_NOT_FOUND_MESSAGE });
      return c.json(await queries.getDetail(run));
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
        return c.json(await queries.getTree(run));
      }
    )

    .post(
      "/:id/step-decisions",
      rateLimit("write"),
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
            return c.json({ stepType: decision.stepType, action: decision.action, ...result.data });
          }
          case "RERUN": {
            const result = await commands.rerunStep({
              workflowRunId: run.id,
              stepType: decision.stepType,
              feedback: decision.feedback,
            });
            if (!result.success) throwTransitionFailure(result);
            return c.json({ stepType: decision.stepType, action: decision.action });
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
            return c.json({ stepType: decision.stepType, action: decision.action, ...result.data });
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
        return c.json({ items: await queries.listPublications(run.id) });
      }
    )

    .post(
      "/:id/publications",
      rateLimit("write"),
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
          c.header("Location", `/api/script-workflows/${run.id}/publications`);
          return c.json({ publicationId: publication.id }, 201);
        } catch (err) {
          if (err instanceof PublicationError) {
            throw new DomainError(400, "BAD_REQUEST", err.message);
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
        return c.json(await queries.listEvents(run.id, type, limit));
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
