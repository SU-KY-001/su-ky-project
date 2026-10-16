const DEFAULT_ORIGIN = "http://localhost:5173";
const WILDCARD_ORIGIN = "*";
const DEVELOPMENT_AUTH_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
];

/** Origins parsed from CORS_ORIGIN (comma separated). May contain "*". */
export function parseAllowedOrigins(): string[] {
  return (process.env.CORS_ORIGIN || DEFAULT_ORIGIN)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/** Better Auth does not treat "*" as a wildcard, so it is dropped for trustedOrigins. */
export function trustedAuthOrigins(): string[] {
  const configured = parseAllowedOrigins().filter((origin) => origin !== WILDCARD_ORIGIN);

  // CORS already permits localhost ports outside production. Better Auth has
  // its own origin check, so keep the two repo dev ports aligned with it even
  // when a developer still has the legacy 5173 value in CORS_ORIGIN.
  if (process.env.NODE_ENV !== "production") {
    configured.push(...DEVELOPMENT_AUTH_ORIGINS);
  }

  return [...new Set(configured)];
}
