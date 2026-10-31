import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Run after `bun run build -- --manifest` from apps/web.
const manifest = JSON.parse(readFileSync(new URL("../dist/.vite/manifest.json", import.meta.url), "utf8"));
const scene = Object.keys(manifest).find(key => key.includes("GalleryScene"));
assert.ok(scene, "Expected a separate gallery runtime chunk");

function staticImports(key, seen = new Set()) {
  if (seen.has(key)) return seen;
  seen.add(key);
  for (const dependency of manifest[key]?.imports ?? []) staticImports(dependency, seen);
  return seen;
}

for (const name of ["index.html", "src/pages/landing/LandingPage.tsx", "src/pages/landing/LandingContent.tsx", "src/pages/exhibition/ExhibitionPage.tsx"]) {
  assert.ok(manifest[name], `Missing build entry: ${name}`);
  const dependencies = staticImports(name);
  assert.ok(!dependencies.has(scene), `${name} eagerly loads the gallery runtime`);
  assert.ok(![...dependencies].some(key => key.includes("ExhibitionEditor")), `${name} eagerly loads the editor`);
  console.log(`PASS: ${name} does not eagerly load the gallery or editor`);
}
console.log(`Deferred gallery runtime: ${manifest[scene].file}`);
