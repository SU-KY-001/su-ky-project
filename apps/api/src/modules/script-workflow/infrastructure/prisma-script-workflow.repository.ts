import {
  prisma,
  Prisma,
  type ScriptPublication as PrismaPublication,
  type StepVersion as PrismaStepVersion,
  type WorkflowEvent as PrismaEvent,
  type WorkflowRun as PrismaRun,
  type WorkflowStep as PrismaStep,
} from "@repo/db";
import {
  StepStatusSchema,
  StepTypeSchema,
  WorkflowStatusSchema,
  type StepStatus,
  type StepType,
} from "@repo/shared";
import type {
  RunNodeEntity,
  ScriptPublicationEntity,
  StepVersionEntity,
  StepVersionWithRun,
  StepVersionWithType,
  WorkflowEventEntity,
  WorkflowRunEntity,
  WorkflowRunWithSteps,
  WorkflowStepEntity,
} from "../domain/script-workflow.entity";
import type {
  InsertPublicationInput,
  InsertStepVersionInput,
  LogEventInput,
  ScriptWorkflowRepository,
  WorkflowRunPatch,
  WorkflowStepPatch,
} from "../domain/script-workflow.repository";

const PRISMA_UNIQUE_VIOLATION = "P2002";

type AncestryRow = PrismaStepVersion & { stepType: string; depth: number };

function toRun(row: PrismaRun): WorkflowRunEntity {
  return {
    id: row.id,
    topic: row.topic,
    status: WorkflowStatusSchema.parse(row.status),
    currentStep: row.currentStep === null ? null : StepTypeSchema.parse(row.currentStep),
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  };
}

function toStep(row: PrismaStep): WorkflowStepEntity {
  return {
    id: row.id,
    workflowRunId: row.workflowRunId,
    stepType: StepTypeSchema.parse(row.stepType),
    status: StepStatusSchema.parse(row.status),
    currentVersion: row.currentVersion,
    approvedVersion: row.approvedVersion,
    errorMessage: row.errorMessage,
    incomingGuidance: row.incomingGuidance,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toVersion(row: PrismaStepVersion): StepVersionEntity {
  return {
    id: row.id,
    workflowStepId: row.workflowStepId,
    parentVersionId: row.parentVersionId,
    version: row.version,
    inputJson: row.inputJson,
    outputJson: row.outputJson,
    humanFeedback: row.humanFeedback,
    validationStatus: row.validationStatus === "invalid" ? "invalid" : "valid",
    createdAt: row.createdAt,
  };
}

function toEvent(row: PrismaEvent): WorkflowEventEntity {
  return {
    id: row.id,
    workflowRunId: row.workflowRunId,
    type: row.type,
    message: row.message,
    metadataJson: row.metadataJson,
    createdAt: row.createdAt,
  };
}

function toPublication(row: PrismaPublication): ScriptPublicationEntity {
  return {
    id: row.id,
    workflowRunId: row.workflowRunId,
    approvedVersionId: row.approvedVersionId,
    approvedById: row.approvedById,
    finalScript: row.finalScript,
    wordCount: row.wordCount,
    estimatedDurationSeconds: row.estimatedDurationSeconds,
    publishedAt: row.publishedAt,
  };
}

function toJsonInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null || value === undefined
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue);
}

export class PrismaScriptWorkflowRepository implements ScriptWorkflowRepository {
  async createWorkflowRun(topic: string, createdById: string): Promise<WorkflowRunEntity> {
    const row = await prisma.workflowRun.create({
      data: { topic, status: "PENDING", currentStep: "RESEARCHER", createdById },
    });
    return toRun(row);
  }

  async getWorkflowRun(id: number): Promise<WorkflowRunEntity | null> {
    const row = await prisma.workflowRun.findUnique({ where: { id } });
    return row ? toRun(row) : null;
  }

  async getOwnedWorkflowRun(id: number, userId: string): Promise<WorkflowRunEntity | null> {
    const row = await prisma.workflowRun.findFirst({ where: { id, createdById: userId } });
    return row ? toRun(row) : null;
  }

  async listWorkflowRuns(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ items: WorkflowRunEntity[]; total: number }> {
    const [rows, total] = await prisma.$transaction([
      prisma.workflowRun.findMany({
        where: { createdById: userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workflowRun.count({ where: { createdById: userId } }),
    ]);
    return { items: rows.map(toRun), total };
  }

  async updateWorkflowRun(id: number, patch: WorkflowRunPatch): Promise<void> {
    await prisma.workflowRun.update({ where: { id }, data: patch });
  }

  async getWorkflowStep(workflowRunId: number, stepType: StepType): Promise<WorkflowStepEntity | null> {
    const row = await prisma.workflowStep.findUnique({
      where: { workflowRunId_stepType: { workflowRunId, stepType } },
    });
    return row ? toStep(row) : null;
  }

  async ensureWorkflowStep(
    workflowRunId: number,
    stepType: StepType,
    status: StepStatus = "PENDING"
  ): Promise<WorkflowStepEntity> {
    const row = await prisma.workflowStep.upsert({
      where: { workflowRunId_stepType: { workflowRunId, stepType } },
      create: { workflowRunId, stepType, status },
      update: {},
    });
    return toStep(row);
  }

  async updateWorkflowStep(id: number, patch: WorkflowStepPatch): Promise<void> {
    await prisma.workflowStep.update({ where: { id }, data: patch });
  }

  async atomicTransitionStepStatus(
    stepId: number,
    expectedStatus: StepStatus,
    expectedVersion: number,
    patch: { status: StepStatus; approvedVersion?: number | null; incomingGuidance?: string | null }
  ): Promise<WorkflowStepEntity | null> {
    const { count } = await prisma.workflowStep.updateMany({
      where: { id: stepId, status: expectedStatus, currentVersion: expectedVersion },
      data: patch,
    });
    if (count === 0) return null;
    const row = await prisma.workflowStep.findUnique({ where: { id: stepId } });
    return row ? toStep(row) : null;
  }

  async setDownstreamStepsStale(workflowRunId: number, downstreamTypes: StepType[]): Promise<void> {
    if (downstreamTypes.length === 0) return;
    await prisma.workflowStep.updateMany({
      where: { workflowRunId, stepType: { in: downstreamTypes } },
      data: { status: "STALE" },
    });
  }

  async getStepVersion(workflowStepId: number, version: number): Promise<StepVersionEntity | null> {
    const row = await prisma.stepVersion.findUnique({
      where: { workflowStepId_version: { workflowStepId, version } },
    });
    return row ? toVersion(row) : null;
  }

  async getStepVersionById(id: number): Promise<StepVersionWithRun | null> {
    const row = await prisma.stepVersion.findUnique({
      where: { id },
      include: { workflowStep: { select: { stepType: true, workflowRunId: true } } },
    });
    if (!row) return null;
    return {
      node: toVersion(row),
      stepType: StepTypeSchema.parse(row.workflowStep.stepType),
      workflowRunId: row.workflowStep.workflowRunId,
    };
  }

  async getAncestry(nodeId: number): Promise<StepVersionWithType[]> {
    const rows = await prisma.$queryRaw<AncestryRow[]>`
      WITH RECURSIVE ancestry AS (
        SELECT sv.*, ws."stepType" AS "stepType", 0 AS depth
        FROM step_versions sv
        JOIN workflow_steps ws ON ws.id = sv."workflowStepId"
        WHERE sv.id = ${nodeId}
        UNION ALL
        SELECT p.*, ws."stepType" AS "stepType", a.depth + 1
        FROM step_versions p
        JOIN ancestry a ON p.id = a."parentVersionId"
        JOIN workflow_steps ws ON ws.id = p."workflowStepId"
      )
      SELECT * FROM ancestry ORDER BY depth DESC
    `;
    return rows.map((row) => ({
      node: toVersion(row),
      stepType: StepTypeSchema.parse(row.stepType),
    }));
  }

  async listRunNodes(workflowRunId: number): Promise<RunNodeEntity[]> {
    const rows = await prisma.stepVersion.findMany({
      where: { workflowStep: { workflowRunId } },
      orderBy: { id: "asc" },
      include: { workflowStep: { select: { stepType: true, status: true, approvedVersion: true } } },
    });
    return rows.map((row) => ({
      node: toVersion(row),
      stepType: StepTypeSchema.parse(row.workflowStep.stepType),
      stepStatus: StepStatusSchema.parse(row.workflowStep.status),
      stepApprovedVersion: row.workflowStep.approvedVersion,
    }));
  }

  async getRunWithStepsAndVersions(workflowRunId: number): Promise<WorkflowRunWithSteps | null> {
    const row = await prisma.workflowRun.findUnique({
      where: { id: workflowRunId },
      include: {
        steps: { include: { versions: { orderBy: { version: "desc" } } } },
      },
    });
    if (!row) return null;
    return {
      ...toRun(row),
      steps: row.steps.map((step) => ({ ...toStep(step), versions: step.versions.map(toVersion) })),
    };
  }

  async insertStepVersion(input: InsertStepVersionInput): Promise<StepVersionEntity> {
    const row = await prisma.stepVersion.create({
      data: {
        workflowStepId: input.workflowStepId,
        version: input.version,
        parentVersionId: input.parentVersionId ?? null,
        inputJson: toJsonInput(input.inputJson),
        outputJson: toJsonInput(input.outputJson),
        humanFeedback: input.humanFeedback ?? null,
        validationStatus: input.validationStatus ?? "valid",
      },
    });
    return toVersion(row);
  }

  async insertPublication(input: InsertPublicationInput): Promise<ScriptPublicationEntity> {
    try {
      const row = await prisma.scriptPublication.create({ data: input });
      return toPublication(row);
    } catch (err) {
      // Concurrent double-publish of the same approved node: return the winner.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === PRISMA_UNIQUE_VIOLATION
      ) {
        const existing = await this.findPublicationByApprovedVersionId(input.approvedVersionId);
        if (existing) return existing;
      }
      throw err;
    }
  }

  async listPublications(workflowRunId: number): Promise<ScriptPublicationEntity[]> {
    const rows = await prisma.scriptPublication.findMany({
      where: { workflowRunId },
      orderBy: { id: "desc" },
    });
    return rows.map(toPublication);
  }

  async findPublicationByApprovedVersionId(
    approvedVersionId: number
  ): Promise<ScriptPublicationEntity | null> {
    const row = await prisma.scriptPublication.findUnique({ where: { approvedVersionId } });
    return row ? toPublication(row) : null;
  }

  async logEvent(input: LogEventInput): Promise<void> {
    await prisma.workflowEvent.create({
      data: {
        workflowRunId: input.workflowRunId,
        type: input.type,
        message: input.message,
        metadataJson: toJsonInput(input.metadataJson),
      },
    });
  }

  async listEvents(
    workflowRunId: number,
    typePrefix: string | undefined,
    limit: number
  ): Promise<WorkflowEventEntity[]> {
    const rows = await prisma.workflowEvent.findMany({
      where: {
        workflowRunId,
        ...(typePrefix ? { type: { startsWith: typePrefix } } : {}),
      },
      orderBy: { id: "desc" },
      take: limit,
    });
    return rows.reverse().map(toEvent);
  }

  async listEventsAfter(
    workflowRunId: number,
    afterId: number,
    limit: number
  ): Promise<WorkflowEventEntity[]> {
    const rows = await prisma.workflowEvent.findMany({
      where: { workflowRunId, id: { gt: afterId } },
      orderBy: { id: "asc" },
      take: limit,
    });
    return rows.map(toEvent);
  }
}
