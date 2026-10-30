import { Prisma, prisma } from "@repo/db";
import type { Angle, CreateAngleInput, UpdateAngleInput } from "@repo/shared";

type Row = Prisma.AiNarrativeAngleGetPayload<object>;

/** Distinct from the ai-check lock namespace so the two never contend. */
const LOCK_NAMESPACE = 7302;
const PRISMA_UNIQUE_VIOLATION = "P2002";
const PRISMA_NOT_FOUND = "P2025";

export type CreateAngleResult = { ok: true; angle: Angle } | { ok: false; reason: "LIMIT" | "NAME_TAKEN" };
export type UpdateAngleResult = { ok: true; angle: Angle } | { ok: false; reason: "NOT_FOUND" | "NAME_TAKEN" };

export interface AngleRepository {
  listByUser(userId: string): Promise<Angle[]>;
  findOwned(userId: string, id: string): Promise<Angle | null>;
  create(userId: string, input: CreateAngleInput, maxPerUser: number): Promise<CreateAngleResult>;
  update(userId: string, id: string, input: UpdateAngleInput): Promise<UpdateAngleResult>;
  /** False when the angle does not exist or belongs to someone else. */
  remove(userId: string, id: string): Promise<boolean>;
}

function toAngle(row: Row): Angle {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    guide: row.guide,
    builtin: false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

export class PrismaAngleRepository implements AngleRepository {
  async listByUser(userId: string): Promise<Angle[]> {
    const rows = await prisma.aiNarrativeAngle.findMany({ where: { userId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    return rows.map(toAngle);
  }

  async findOwned(userId: string, id: string): Promise<Angle | null> {
    const row = await prisma.aiNarrativeAngle.findFirst({ where: { id, userId } });
    return row ? toAngle(row) : null;
  }

  async create(userId: string, input: CreateAngleInput, maxPerUser: number): Promise<CreateAngleResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Serialises one user's creates so the count below cannot be passed by two concurrent POSTs.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_NAMESPACE}::int, hashtext(${userId}))`;
        if ((await tx.aiNarrativeAngle.count({ where: { userId } })) >= maxPerUser) return { ok: false as const, reason: "LIMIT" as const };
        return { ok: true as const, angle: toAngle(await tx.aiNarrativeAngle.create({ data: { userId, ...input } })) };
      });
    } catch (error) {
      if (isPrismaError(error, PRISMA_UNIQUE_VIOLATION)) return { ok: false, reason: "NAME_TAKEN" };
      throw error;
    }
  }

  async update(userId: string, id: string, input: UpdateAngleInput): Promise<UpdateAngleResult> {
    // Ownership check first: a non-owner update would otherwise log a Prisma P2025 error for an ordinary 404.
    if (!(await prisma.aiNarrativeAngle.findFirst({ where: { id, userId }, select: { id: true } }))) return { ok: false, reason: "NOT_FOUND" };
    try {
      return { ok: true, angle: toAngle(await prisma.aiNarrativeAngle.update({ where: { id, userId }, data: input })) };
    } catch (error) {
      if (isPrismaError(error, PRISMA_UNIQUE_VIOLATION)) return { ok: false, reason: "NAME_TAKEN" };
      if (isPrismaError(error, PRISMA_NOT_FOUND)) return { ok: false, reason: "NOT_FOUND" };
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<boolean> {
    return (await prisma.aiNarrativeAngle.deleteMany({ where: { id, userId } })).count > 0;
  }
}
