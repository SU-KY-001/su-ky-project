import type { Prisma } from "@repo/db";

/** JSON-safe snapshot for Prisma `Json` columns: `bigint` cannot be serialised, so it becomes a string. */
export function jsonSnapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  ) as Prisma.InputJsonValue;
}
