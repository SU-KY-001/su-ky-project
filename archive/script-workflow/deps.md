# Dependencies used by the archived workflow

| Item | Where it stays |
|---|---|
| `pg-boss` | Still used by `core/jobs/maintenance-jobs.ts`. The workflow queue was a second, separate `PgBoss` instance (queues `agent.*`, per-step retry, `MAX_QUEUE_RETRY_COUNT = 3`). |
| `@earendil-works/pi-coding-agent`, `pi-web-access`, `zod-to-json-schema` | Kept for `modules/ai-engine`. |
| Env `PI_PROVIDER`, `PI_MODEL`, `PI_THINKING_LEVEL`, `PI_API_KEY`, `PI_WEB_ACCESS_DIR`, `GEMINI_API_KEY`, `OPENCODE_API_KEY` | Kept (optional) in `core/env.ts` and `.env.example`. |
| Constants (`script-workflow.constants.ts`) | Queue names per step, `MAX_QUEUE_RETRY_COUNT = 3`, SSE poll 1000 ms, heartbeat 8000 ms (must stay below Bun idleTimeout), batch limit 200. Engine constants moved to `ai-engine.constants.ts`. |
| Health | `GET /health` used to report `queue` and `ai` from the workflow runtime; it now reports the maintenance queue only. |
