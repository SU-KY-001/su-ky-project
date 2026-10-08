/**
 * Dev-only moderator account. Hardcoded on purpose: the project owner accepted
 * this for local development. Never import from the root index; the web app only
 * loads it behind `import.meta.env.DEV` and the seed script refuses production.
 */
export const DEV_MODERATOR = {
  name: "Dev Moderator",
  email: "moderator@dev.local",
  password: "dev-moderator-123",
} as const;
