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
  return parseAllowedOrigins().filter((origin) => origin !== WILDCARD_ORIGIN);
}
