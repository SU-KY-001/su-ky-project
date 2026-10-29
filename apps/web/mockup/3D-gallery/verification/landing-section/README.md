# Landing exhibition section verification

Implemented the approved structure as a native section between `library-history` and `library-podcasts`, retaining their container, typography scale, spacing, shared controls and public tokens. The text selector controls one live instance of the existing `GalleryScene` renderer and its walking/collision/drag controls; the CTA always links to `/trien-lam/<selected slug>`. No static preview, poster, thumbnail, AI image or runtime sample exhibition list was added.

## Public API

Anonymous `GET /api/exhibitions` returns `{ items: [{ slug, title, description }] }`, or `{ items: [] }`. The repository filters for a non-null published revision/document and reads metadata exclusively from `publishedDocument`; descriptions are limited to 240 characters and ordering is newest publication first with an ID tie-breaker. No draft metadata, owner IDs, studio actions, scene assets or moderator endpoint are exposed by this list. Existing public detail and studio/editor routes remain intact; OpenAPI and the shared response schema include the new list.

## Validation

- `apps/web`: `bun run check-types` passed on the final implementation.
- `apps/api`: `bun run check-types` passed.
- `apps/api`: `bun test tests/exhibition.test.ts tests/openapi.test.ts` passed: 10 tests, 0 failures. Existing recursive-reference schema-generation warnings remain in unrelated script-document schemas.
- `apps/web`: movement, artworkLayout and resolvedLayout tests passed: 10 tests, 0 failures.
- `apps/api`: exhibition integration test skipped because `RUN_INTEGRATION` is disabled. Added assertions verify unpublished entries are absent and post-publication draft title edits do not change public list metadata when run against the test database.
- Started Vite with `bun run dev --host 127.0.0.1` and inspected the running landing page through deterministic Chrome CDP scripts, without starting a browser agent.
- At 1440px and 390px: verified section order, one canvas before and after selection, changed room text, `/trien-lam/second` CTA after choosing the second exhibition, zero horizontal overflow, and no uncaught browser exceptions. WASD and drag changed the actual rendered viewpoint; before/moved screenshots capture the difference.
- Mobile/reduced-motion checks: selector and CTA fit the page; touch direction controls are present; no automatic camera movement is added. Rendering pauses outside the viewport and WebGL initializes only near the section. Keyboard movement requires canvas focus and Tab remains available to leave it.
- Empty list, list API failure, scene API failure, and disabled WebGL were inspected at 390px. Failures show text, retry where applicable, and retain the selected CTA when a selection exists. See `fallback-results.json` and corresponding screenshots.

## Evidence limits

The local API was not running. Browser checks intercepted public API requests with two test-only exhibition fixtures and empty surrounding catalog results; the fixtures are not application/runtime data. The fixture scenes intentionally have no artworks, so the screenshots prove real rendering, movement, state handling and selection wiring, but do not establish the appearance of live published artwork content. A live API/test database check with existing published exhibitions remains for integration verification; no database migration, reset or seed was performed.

The approved mockup and prompt were not changed. No Git commands were run and no dependencies were added. Screenshots and JSON observations in this folder are verification artifacts.

## Changed source files

- `packages/shared/src/schemas/exhibition.ts`
- `apps/api/src/modules/exhibition/domain/exhibition.repository.ts`
- `apps/api/src/modules/exhibition/infrastructure/prisma-exhibition.repository.ts`
- `apps/api/src/modules/exhibition/application/exhibition.service.ts`
- `apps/api/src/modules/exhibition/presentation/exhibition.routes.ts`
- `apps/api/src/routes/docs/paths/exhibitions.ts`
- `apps/api/tests/exhibition.test.ts`
- `apps/api/tests/exhibition-integration.test.ts`
- `apps/web/src/features/exhibition/EmbeddedExhibition.tsx`
- `apps/web/src/features/exhibition/components/GalleryControls.tsx`
- `apps/web/src/features/exhibition/components/GalleryScene.tsx`
- `apps/web/src/features/exhibition/index.ts`
- `apps/web/src/features/landing/components/ExhibitionSection.tsx`
- `apps/web/src/features/landing/components/library/PodcastLibrary.tsx`
- `apps/web/src/features/landing/services/libraryService.ts`
