import path from "node:path";

// Dedicated local test database only; never run fixture-writing tests against production.
const databaseUrl = process.env.PROFILE_TEST_DATABASE_URL ?? "postgresql://suky_test:profile_test_only@127.0.0.1:55439/suky_profile_test";
const database = new URL(databaseUrl);
if (!["127.0.0.1", "localhost", "[::1]"].includes(database.hostname) || !/test/i.test(database.pathname)) throw new Error("Profile integration requires a localhost database with 'test' in its name.");
const root = path.resolve(import.meta.dir, "..");
const files = [
  "podcast-ranking-window", "podcast-ranking", "playlists-contract", "playlists-routes", "playlists-service", "ranking-playlists-integration",
  "listening-session-contract", "listening-session-policy", "listening-session-repository", "listening-session-integration",
  "top-quizzes", "top-quizzes-integration", "profile-contract", "profile-routes", "profile-service", "openapi", "listening-history-minimum",
];
const result = Bun.spawnSync([process.execPath, "test", ...files.map((file) => `tests/${file}.test.ts`)], {
  cwd: path.join(root, "apps/api"), env: { ...process.env, DATABASE_URL: databaseUrl, RUN_INTEGRATION: "1" }, stdout: "inherit", stderr: "inherit",
});
process.exit(result.exitCode);
