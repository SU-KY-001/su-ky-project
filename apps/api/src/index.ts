import { app } from "./app";

const port = Number(process.env.PORT || 3000);

console.log(`
🏯 ==========================================
   Su-Ky (Sử Ký) API Service
   Runtime: Bun ${typeof Bun !== "undefined" ? Bun.version : "unknown"}
   Port:    http://localhost:${port}
   Health:  http://localhost:${port}/health
==========================================
`);

export default {
  port,
  fetch: app.fetch,
};
