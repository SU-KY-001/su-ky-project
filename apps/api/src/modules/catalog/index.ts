import { CatalogService } from "./application/catalog.service";
import { PrismaCatalogRepository } from "./infrastructure/prisma-catalog.repository";
import { createPublicCatalogRoute, createStudioCatalogRoute } from "./presentation/catalog.routes";

const repository = new PrismaCatalogRepository();
const catalogService = new CatalogService(repository, repository, repository);

export const publicCatalogRoute = createPublicCatalogRoute(catalogService);
export const studioCatalogRoute = createStudioCatalogRoute(catalogService);
