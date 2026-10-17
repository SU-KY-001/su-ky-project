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

  // Vite serves the web app on port 3000 in this repo. Keep Better Auth's
  // origin check aligned with the CORS middleware's localhost dev allowance.
  if (process.env.NODE_ENV !== "production") {
    configured.push("http://localhost:3000", "http://localhost:5173");
  }

  return [...new Set(configured)];
}
