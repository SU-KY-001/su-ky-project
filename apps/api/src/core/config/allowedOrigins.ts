const DEFAULT_ORIGIN = "http://localhost:5173";
const WILDCARD_ORIGIN = "*";

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

  // When no value is configured, trust both development ports used by this
  // repo. An explicit allowlist stays authoritative in every environment.
  if (process.env.NODE_ENV !== "production" && !process.env.CORS_ORIGIN?.trim()) {
    configured.push("http://localhost:3000", "http://localhost:5173");
  }

  return [...new Set(configured)];
}
