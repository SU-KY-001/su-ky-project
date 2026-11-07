import type { CatalogActor } from "./schemas/content/historical-catalog";

export function canEditHistoricalContent(
  actor: CatalogActor | null | undefined,
  createdById: string | null | undefined,
  kind: "period" | "phase" | "entity",
): boolean {
  if (!actor?.userId) return false;
  if (actor.role === "admin") return true;
  if (actor.role !== "moderator") return false;
  return createdById === actor.userId || (createdById === null && kind !== "entity");
}
