import { BaseVersionSchema } from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono, type Context } from "hono";
import { z } from "zod";
import {
  HistoricalEntityInputSchema,
  HistoricalEntityQuerySchema,
  PatchHistoricalEntitySchema,
  CreateSourceSchema,
  PatchSourceSchema,
  SourceQuerySchema,
} from "@repo/shared";
import {
  idempotency,
  rateLimit,
  throwOnInvalid,
} from "../../../core/middleware";
import { requireAuth, requireRole } from "../../auth";
import type { AppEnv } from "../../../types";
import type { MediaStorageGateway } from "../../media";
import type {
  CatalogActor,
  CatalogService,
} from "../application/catalog.service";
import type { Source } from "../domain/catalog.entity";

const idParam = z.object({ id: z.string().uuid() });
const similarSourceQuery = z.object({
  title: z.string().trim().min(1),
  author: z.string().trim().optional(),
  isbn: z.string().trim().optional(),
});
const similarEntityQuery = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["FIGURE", "EVENT"]).optional(),
});

const resolveActor = (c: Context<AppEnv>): CatalogActor => {
  const session = c.get("session")!;
  return { userId: session.user.id, role: session.user.role };
};

/** Replaces the raw `fileAsset` row with the delivery URL the studio needs to open the uploaded PDF. */
export function mapSource<T extends Source>(
  source: T,
  storage: MediaStorageGateway,
) {
  const { fileAsset, ...rest } = source;
  return {
    ...rest,
    file: fileAsset
      ? {
          assetId: fileAsset.id,
          url: storage.deliveryUrl(fileAsset),
          format: fileAsset.format,
          sizeBytes:
            fileAsset.sizeBytes === null ? null : Number(fileAsset.sizeBytes),
        }
      : null,
  };
}

export function createPublicCatalogRoute(service: CatalogService) {
  return new Hono<AppEnv>()
    .get("/topics", async (c) => c.json({ items: await service.listTopics() }))
    .get("/historical-periods", async (c) =>
      c.json({ items: await service.listHistoricalPeriods() }),
    );
}

export function createStudioCatalogRoute(
  service: CatalogService,
  storage: MediaStorageGateway,
) {
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator", "admin"))
    .get(
      "/sources/similar",
      zValidator("query", similarSourceQuery, throwOnInvalid),
      async (c) =>
        c.json({
          items: (await service.listSimilarSources(c.req.valid("query"))).map(
            (source) => mapSource(source, storage),
          ),
        }),
    )
    .get(
      "/sources",
      zValidator("query", SourceQuerySchema, throwOnInvalid),
      async (c) =>
        c.json(
          await service
            .listSources(c.req.valid("query"))
            .then(({ items, ...meta }) => ({
              items: items.map((source) => mapSource(source, storage)),
              ...meta,
            })),
        ),
    )
    .get(
      "/sources/:id",
      zValidator("param", idParam, throwOnInvalid),
      async (c) =>
        c.json(
          mapSource(await service.getSource(c.req.valid("param").id), storage),
        ),
    )
    .post(
      "/sources",
      idempotency(),
      rateLimit("write"),
      zValidator("json", CreateSourceSchema, throwOnInvalid),
      async (c) => {
        const source = await service.createSource(
          resolveActor(c),
          c.req.valid("json"),
        );
        c.header("Location", `/api/studio/sources/${source.id}`);
        return c.json(mapSource(source, storage), 201);
      },
    )
    .patch(
      "/sources/:id",
      rateLimit("write"),
      zValidator("param", idParam, throwOnInvalid),
      zValidator("json", PatchSourceSchema, throwOnInvalid),
      async (c) =>
        c.json(
          mapSource(
            await service.updateSource(
              resolveActor(c),
              c.req.valid("param").id,
              c.req.valid("json"),
            ),
            storage,
          ),
        ),
    )
    .post(
      "/sources/:id/archive",
      rateLimit("write"),
      zValidator("param", idParam, throwOnInvalid),
      zValidator("json", BaseVersionSchema, throwOnInvalid),
      async (c) =>
        c.json(
          mapSource(
            await service.archiveSource(
              resolveActor(c),
              c.req.valid("param").id,
              c.req.valid("json").baseVersion,
            ),
            storage,
          ),
        ),
    )
    .post(
      "/sources/:id/unarchive",
      rateLimit("write"),
      zValidator("param", idParam, throwOnInvalid),
      zValidator("json", BaseVersionSchema, throwOnInvalid),
      async (c) =>
        c.json(
          mapSource(
            await service.unarchiveSource(
              resolveActor(c),
              c.req.valid("param").id,
              c.req.valid("json").baseVersion,
            ),
            storage,
          ),
        ),
    )
    .get(
      "/historical-entities/similar",
      zValidator("query", similarEntityQuery, throwOnInvalid),
      async (c) =>
        c.json({
          items: await service.listSimilarHistoricalEntities(
            c.req.valid("query"),
          ),
        }),
    );
}
