import { mediaStorage } from "../media";
import { CatalogService } from "./application/catalog.service";
import { PrismaCatalogRepository } from "./infrastructure/prisma-catalog.repository";
import {
  createPublicCatalogRoute,
  createStudioCatalogRoute,
} from "./presentation/catalog.routes";
import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { PrismaHistoricalCatalogRepository } from "./infrastructure/prisma-historical-catalog.repository";
import { HistoricalCatalogService } from "./application/historical-catalog.service";
import { HistoricalCitationService } from "./application/historical-citation.service";
import { CatalogReviewService } from "./application/catalog-review.service";
import { createHistoricalPresenter } from "./application/historical-catalog.mappers";
import { createHistoricalCatalogRoutes } from "./presentation/historical-catalog.routes";
import { createHistoricalCitationRoutes } from "./presentation/historical-citation.routes";
import { createCatalogReviewRoutes } from "./presentation/catalog-review.routes";
import { PublicHistoricalService } from "./application/public-historical.service";
import { createPublicHistoricalRoutes } from "./presentation/public-historical.routes";

const repository = new PrismaCatalogRepository();
const catalogService = new CatalogService(repository, repository, repository);

export const historicalRepository = new PrismaHistoricalCatalogRepository();
export const historicalCatalogService = new HistoricalCatalogService(
  historicalRepository,
);
export const historicalCitationService = new HistoricalCitationService(
  historicalRepository,
  historicalCatalogService,
  mediaStorage,
);
export const catalogReviewService = new CatalogReviewService(
  historicalRepository,
  historicalCatalogService,
  historicalCitationService,
);
export const presentHistoricalNode = createHistoricalPresenter(
  historicalCatalogService,
  historicalCitationService,
  catalogReviewService,
);
export const publicCatalogRoute = new Hono<AppEnv>()
  .route("/", createPublicCatalogRoute(catalogService))
  .route(
    "/",
    createPublicHistoricalRoutes(
      new PublicHistoricalService(historicalRepository, presentHistoricalNode),
    ),
  );
export const studioCatalogRoute = new Hono<AppEnv>()
  .route("/", createStudioCatalogRoute(catalogService, mediaStorage))
  .route(
    "/",
    createHistoricalCatalogRoutes(
      historicalCatalogService,
      presentHistoricalNode,
      catalogReviewService,
    ),
  )
  .route("/", createHistoricalCitationRoutes(historicalCitationService))
  .route(
    "/",
    createCatalogReviewRoutes(
      catalogReviewService,
      presentHistoricalNode,
      mediaStorage,
    ),
  );
