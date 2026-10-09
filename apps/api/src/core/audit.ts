import type { DbClient, Prisma } from "@repo/db";

export interface AuditInput {
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: Prisma.InputJsonValue;
  ipAddress: string | null;
}

export async function writeAudit(db: DbClient, input: AuditInput): Promise<void> {
  await db.auditLog.create({ data: input });
}

export function requestIpAddress(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",", 1)[0]?.trim() || null;
}
