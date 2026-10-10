import type { Prisma, PrismaClient as PrismaClientType } from "@prisma/client";
export { prisma, PrismaClient } from "./client";
export type DbClient = PrismaClientType | Prisma.TransactionClient;
export * from "@prisma/client";
