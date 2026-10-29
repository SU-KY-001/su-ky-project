# Landing exhibition performance implementation plan

**Goal:** Keep the landing page free of the 3D runtime and load the gallery only after the visitor enters an exhibition.

**Approved design:** Landing shows public exhibition summaries after history, linking to `/trien-lam/:slug`. The exhibition poster appears first; the gallery loads on entry. Retain the existing visual tokens, navigation, moderator preview and accessible fallback to documents.

**Approach:** Reuse the existing public list API and library components. Avoid automatic prefetch of heavy resources. Introduce a lightweight public entry point and isolate the initial camera value from the runtime controls module.

- [x] Replace the embedded canvas with public summary links and loading/error/empty states.
- [x] Isolate the public route from editor and 3D barrel imports.
- [x] Gate scene mounting on entry, keep the poster during loading, support cancel and document fallback.
- [x] Verify regression tests, typecheck, production build, and static chunk dependencies for landing/poster.

No dependencies or Git operations are needed. Runtime performance measurements require a browser; build dependency checks prove loading boundaries, not frame-rate gains.

Verification: 18 focused tests passed; `bun run check-types` passed; `bun run build -- --manifest` passed. `node scripts/check-exhibition-bundles.mjs` confirms the main entry, landing and public exhibition route do not eagerly import the gallery or editor. The gallery chunk is approximately 947 KB (252 KB gzip). The build still warns about large deferred chunks.

The poster uses a single published artwork as its static background rather than the previous live gallery. WebGL initialization is deferred until entry; the loading poster remains until the first scene frame, and cancellation unmounts the scene. Existing moderator previews still start directly in the gallery.

Browser inspection was attempted but the browser access host is unavailable. Visual QA and device timing/FPS measurements remain unverified. A broad Bun filter initially also picked up generated dist tests; rerunning explicit source test paths passed without those generated-file errors.

Independent review identified a pointer-lock compatibility issue in the newly enabled click-to-lock path. The shared control now checks API presence and Promise return and catches synchronous denial, preserving drag controls when pointer lock is unavailable.

Follow-up: the user reported immediate fallback instead of entering 3D. Installed Fiber code confirms that `fallback` is always mounted as HTML canvas children, so the fallback component's effect falsely reported WebGL failure even on supported devices. Removed that effect; a regression test reproduced the false failure before the fix and passes afterward. Real scene failures now open the map directly, removing the intermediate unavailable screen.

The entry button now opens the map; choosing a room requests the scene. The map uses landing paper/ink/vermilion tokens, responsive typography and hidden scrollbars while retaining scrolling. Tests cover map open/close without mounting a scene, cancellation, first-frame entry and failure returning to the map. Nineteen focused tests, typecheck and production build passed. Browser visual/WebGL inspection remains unavailable.

Follow-up review also caught focus restoration during map-to-artwork transitions. Dialogs now restore background focus only if no other dialog is open; focused regression tests passed after this adjustment.
