# Research Report: Stability patterns for LLM-backed async features (Bun/Hono/Prisma/pg-boss, Gemini)

Date: 2026-10-22. Author: StabilityPatternsResearch. No source edited.

Evidence tags: **[V]** = fetched this session (URL given). **[M]** = from model knowledge of well-known spec/docs, URL cited but NOT fetched this session (5-call budget used) → re-verify before coding. **[UNVERIFIED]** = no source.

## TOC
1 Exec summary · 2 Methodology · 3 Findings (G1 Gemini, G2 SSE, G3 Postgres jobs, G4 Resilience, G5 Safety/eval) · 4 Comparative · 5 Recommendations · 6 Pitfalls · 7 Refs · 8 Decision table · 9 Unresolved

## 1. Executive Summary
Stack already has pg-boss + Postgres + zod + pino. Stability needs **zero new infra**. Biggest wins, in order: (a) Gemini native JSON-schema output + zod re-validate (drop prompt-only JSON); (b) persistent `ai_run` row = source of truth (state machine, `seq` event log, heartbeat, reaper) — SSE is just a replay view of it; (c) bounded retry w/ full jitter + per-provider concurrency cap + Postgres token bucket; (d) deterministic validators + small golden fixtures; (e) treat doc text as untrusted data.
Reject now: Redis/Kafka, full circuit-breaker lib, promptfoo infra, LISTEN/NOTIFY as sole transport. Defer: LISTEN/NOTIFY wake-up hint, transactional outbox beyond "insert run + boss.send in one tx", IETF idempotency header (use simple client-supplied key column).

## 2. Methodology
5 tool calls: ck-research skill, Gemini models page, structured-output page, troubleshooting page, pg-boss home. Everything else [M]. Date range of fetched: docs "last updated" 2026-10-13..21. Terms: responseSchema, Last-Event-ID, retryBackoff, full jitter, LLM01.

## 3. Key Findings

### G1. Gemini API
**Model id [V]** https://ai.google.dev/gemini-api/docs/models — `gemini-3.5-flash-lite` exists, listed **Stable** ("fastest, most cost-effective 3.5 model"). Same page also lists `gemini-3.1-flash-lite` (Stable), `gemini-3.6-flash`, `gemini-3.8-flash`, `gemini-4-argon` (flagship). `gemini-3.1-flash-lite-preview`, `gemini-2.0-flash*` = Shut down. Rules [V]: stable ids "usually don't change"; `*-latest` aliases hot-swap w/ 2-week email notice; previews deprecated with ≥2 weeks notice → **pin stable id via env, never `-latest`**. Our id is valid.

**Structured output [V]** https://ai.google.dev/gemini-api/docs/structured-output — "configure Gemini models to generate responses that adhere to a provided JSON Schema… predictable, type-safe". Current doc example uses new Interactions API: `response_format:{type:"text",mime_type:"application/json",schema}`; docs show Zod via `z.fromJSONSchema` and re-parse of output. [M] classic `generateContent` equivalent = `generationConfig.responseMimeType="application/json"` + `responseSchema`/`responseJsonSchema` (https://ai.google.dev/gemini-api/docs/structured-output older revisions). Which endpoint Pi SDK calls = [UNVERIFIED]; check Pi provider support before assuming it forwards schema.
- Reliability: schema-constrained decoding ≫ prompt-only JSON for syntax validity [M]. Still: schema ≠ semantics; **keep zod validate + 1 retry** (doc itself re-validates).
- Schema subset limits [M, doc body beyond line 300 not read]: only a subset of JSON Schema supported; very large/deeply nested schemas can be rejected (400). Keep schemas flat, all fields `required` — troubleshooting page [V] says "Make all output fields required" and "Don't specify the order of fields in your prompt" to avoid repeated-text bug.
- Known pitfall [V] https://ai.google.dev/gemini-api/docs/troubleshooting: repeated `\n` in structured output when prompt contains `\u`/escape sequences → add system line "only allowed escapes are \\, \n, \"; use UTF-8 instead of \u". **Relevant to Vietnamese** (diacritics): never put `\uXXXX` in examples; send raw UTF-8.
- Vietnamese: Vietnamese is in the supported-language concept; troubleshooting [V] warns unsupported languages "can produce unexpected or even blocked responses" and points to supported list. Vietnamese support level for flash-lite quality = [UNVERIFIED] → covered by golden set (G5).
- Knobs [V troubleshooting]: Gemini 3.x has **thinking on by default** → higher latency+tokens; lower thinking level or disable for cost/latency (https://ai.google.dev/gemini-api/docs/thinking#thinking-levels). Page lists temperature 0.0–1.0 [V] (note: this contradicts [M] Gemini 3 guidance of keeping default temp 1.0 / range 0–2 → verify; do not tune temp low "for determinism" without test). Higher temp ≥0.8 recommended against repetition loops [V]. RECITATION finish reason: make prompt unique / higher temp [V]. Safety blocks: `BlockedReason.OTHER` etc. [V] → map to non-retryable.
- Recommendation: checks (classification/review) = minimal thinking + schema; generations (outline/draft) = default/low thinking + schema; `maxOutputTokens` always set (bound cost + runaway repeats).

**Errors/limits [V]** https://ai.google.dev/gemini-api/docs/troubleshooting: retry on transient `429 RESOURCE_EXHAUSTED`, `503 UNAVAILABLE`, `408`, `5xx`; **don't retry 400/402/403**. Use exponential backoff (1s,2s,4s,8s) **+ jitter + max retries**. Python SDK auto-retries up to 4× (~1s initial, 60s max) [V]; JS SDK/Pi default retry = [UNVERIFIED] → avoid double-retry stacks (SDK retry × our retry × pg-boss retry): set one layer owner. Full code list: https://ai.google.dev/gemini-api/docs/api-errors [not fetched]. Rate limits (RPM/TPM/RPD per project, per model) https://ai.google.dev/gemini-api/docs/rate-limits [M]; actual numbers are tier/model specific and shown in AI Studio → read from env, don't hardcode.
**usageMetadata [M]** https://ai.google.dev/api/generate-content#UsageMetadata : `promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`, `thoughtsTokenCount` (thinking billed as output), `cachedContentTokenCount`. Persist per run for cost + quota tracking. Whether Pi SDK exposes these = [UNVERIFIED].

### G2. Resumable SSE
- Spec [M] https://html.spec.whatwg.org/multipage/server-sent-events.html : event `id:` field sets lastEventId; on reconnect browser sends `Last-Event-ID` header; `retry:` sets reconnect ms; comment lines `: text` ignored (use as heartbeat); text/event-stream, UTF-8. Native `EventSource` can't send custom headers/POST → auth via cookie (same-origin) or use fetch-based client (e.g. `@microsoft/fetch-event-source`) [M].
- Replay-from-DB (standard): every event row `(run_id, seq bigint, type, payload jsonb)` unique(run_id,seq); `id:` = seq. Handler: subscribe to live in-process emitter first (buffer), then `SELECT … WHERE seq > :lastId ORDER BY seq`, flush, then drain buffer dropping seq ≤ last sent (dedupe) = "subscribe-then-replay" (matches our plan). If run terminal → send events then close. If events pruned → send `snapshot` event.
- Proxy pitfalls [M]: nginx buffering → send `X-Accel-Buffering: no`, `Cache-Control: no-cache, no-transform`; compression middleware buffers/gzips streams → exclude `text/event-stream` from Hono `compress()`; idle proxy timeouts (~60s) → heartbeat comment every ~15–25s; HTTP/1.1 6-connections-per-origin browser cap → one SSE per run, close on terminal. Hono `streamSSE` (https://hono.dev/docs/helpers/streaming#streamsse) supports `writeSSE({id,event,data})`, `stream.onAbort`, `stream.sleep` [M]; always handle abort to unsubscribe (leak otherwise).
- Cross-process (API ≠ worker): worker only writes DB rows (+ optional NOTIFY); API process tails. See LISTEN/NOTIFY below. Fallback without NOTIFY: poll `seq > last` every 500–1000ms while connected — simple, bounded, ok for admin-scale users.
- Do NOT put the token stream (deltas) in DB per token; persist per-block/per-phase events + final result (write amplification) [INFERENCE].

### G3. Job reliability on Postgres
**pg-boss [V home]** https://pgboss.io/ : SKIP LOCKED; retries with exponential backoff; dead-letter queues with redrive; queue policies (rate limit, debounce, concurrency); send/complete inside existing transaction w/ Prisma adapter; optional LISTEN/NOTIFY for low-latency delivery; multi-master safe; requires PG ≥13, Node ≥22.12 or Bun. Option names [M] https://pgboss.io/api/jobs : `retryLimit`, `retryDelay`, `retryBackoff` (+ `retryDelayMax`), `expireInSeconds` (active job exceeding → failed & retried per retryLimit = built-in stale-job handling for crashed workers), `singletonKey`/`singletonSeconds` (dedupe), `deadLetter` queue, `heartbeatSeconds` [UNVERIFIED — newer feature; check pg-boss version installed, `bun pm ls pg-boss`]. Caveat: expire kills record, not the in-flight handler → handler must be idempotent and check `AbortSignal`.
- **Idempotent handler**: job may run twice (expire + retry, or worker crash after side effect). Guard with run row: `UPDATE ai_run SET state='RUNNING', attempt=attempt+1 WHERE id=$1 AND state IN ('QUEUED','RUNNING_STALE') RETURNING *`; no row → skip. Side effects (TTS file write) keyed by deterministic path/id.
- **Transactional outbox** [M] https://microservices.io/patterns/data/transactional-outbox.html : avoid dual-write (DB row + queue publish). With pg-boss on same Postgres + Prisma adapter, `boss.send` inside the same tx *is* the outbox → no extra table. Defer separate outbox.
- **Idempotency-Key HTTP** [M] https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ : client sends `Idempotency-Key`; server stores key→response/run; same key+different payload → 422; in-flight duplicate → 409. Minimal: `UNIQUE(user_id, idempotency_key)` on `ai_run`; on conflict return existing run id. Don't implement whole draft (fingerprint, response caching) now.
- **State machine + heartbeat + reaper** (standard; no single canonical URL; cf. Postgres queue literature [M]): states `QUEUED→RUNNING→{SUCCEEDED,FAILED,CANCELED}` (+`EXPIRED`); running owner updates `heartbeat_at` every N s; reaper (pg-boss cron schedule, singleton) marks `RUNNING AND heartbeat_at < now()-3×interval` → FAILED(`worker_lost`) or re-queue if attempts left, and emits terminal event so SSE clients unblock. Also reaper for API-process checks (those run in API process: a restart orphans RUNNING rows → reaper on boot + periodic). Terminal transitions guarded by `WHERE state='RUNNING'` (CAS) to avoid races with late finishers.
- **LISTEN/NOTIFY** [M] https://www.postgresql.org/docs/current/sql-notify.html : payload < 8000 bytes (default config); notifications delivered only to *session* listening, lost if disconnected, not persisted; transaction-scoped delivery at commit; heavy NOTIFY w/ many listeners can serialize commits (global lock) [M]. **Needs a dedicated, direct, long-lived connection** — breaks under pgbouncer transaction pooling (listen state lost per-session) [M]. Rule: NOTIFY carries only `{runId, seq}` hint; truth always in table; on (re)connect always do replay query. pg-boss's own LISTEN/NOTIFY is optional for delivery latency [V home]. Minimal use: one shared LISTEN connection per API process, fan-out in-process via EventEmitter; if DB is behind pooler (check Supabase/Neon URL = [UNVERIFIED]) → use polling instead.

### G4. Provider resilience
- **Timeouts**: every provider call `AbortSignal.timeout(env)`; separate connect/total; per-run overall deadline. [M] https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
- **Backoff + full jitter** [M] https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ : `sleep = random(0, min(cap, base*2^attempt))`; best total work & completion vs equal/decorrelated. Honor `Retry-After` if present [M]. Google endorses backoff+jitter+max retries [V troubleshooting]. Retry only 408/429/5xx/network; schema-fail = 1 repair retry (separate counter).
- **Retry budget/layering** [M, same AWS builders-library]: retry at one layer only (recommend: in-process short retries ≤2–3 for 429/503; pg-boss retries for crash-level for TTS jobs). Retries amplify load during outage.
- **Circuit breaker** [M] https://martinfowler.com/bliki/CircuitBreaker.html : trip after N consecutive failures, fail fast, half-open probe. For single provider + low traffic: **later**; a ~30-line in-memory breaker (consecutive failures → open for 30s, return `provider_unavailable`) is enough if outages hurt; per-process state, no storage.
- **Bulkhead** [M] https://learn.microsoft.com/azure/architecture/patterns/bulkhead : separate concurrency pools: LLM-check pool (e.g. semaphore N), TTS pool (pg-boss `localConcurrency`/policy). Prevents TTS backlog from starving interactive checks. Cheap: in-process semaphore (p-limit-style, ~15 lines). Limits are per-process; multiple API replicas multiply → global cap via Postgres limiter.
- **Token bucket/GCRA in Postgres** [M] https://en.wikipedia.org/wiki/Generic_cell_rate_algorithm ; single-row `rate_bucket(key, tokens, updated_at)` with atomic `UPDATE … RETURNING` (refill computed in SQL) or GCRA with one `tat timestamptz` column — `UPDATE … SET tat = GREATEST(tat, now()) + interval WHERE tat <= now()+burst RETURNING` (fewer columns, no race). Row lock serializes = correct; throughput fine at provider RPM scale. pg-boss queue-level rate limit [V home "rate limiting"] may suffice for TTS jobs alone → check before building custom limiter. For Gemini RPM, same table works w/ different key.
- Cost control: log usageMetadata; per-user daily run quota row; `maxOutputTokens`.

### G5. Output safety / eval
- **Deterministic validators as guardrails** (standard "guardrails" idea; cf. https://platform.openai.com/docs/guides/safety-best-practices [M], model-agnostic): after zod, run code checks: quoted-source substring actually exists in source doc (anti-hallucinated citation), URL domain allowlist, length/count bounds, no empty fields, ids reference existing blocks, Vietnamese-diacritics sanity (NFC normalize), proposals never auto-applied (human accept) = existing design. Cheapest, highest ROI.
- **Golden-set evals** [M] https://www.promptfoo.dev/docs/intro/ : YAML test cases + assertions (`is-json`, `contains`, `javascript`, `llm-rubric`). Overkill dependency for now; do instead 10–30 JSON fixtures (input doc block → expected invariants, not exact text) run by `bun test` with `LIVE_LLM=1` gate; also run against recorded responses in CI (no network). Run on every prompt/model-id change. Revisit promptfoo if >3 prompts/regular model swaps.
- **Prompt injection** [M] https://genai.owasp.org/llmrisk/llm01-prompt-injection/ (OWASP LLM01:2025): indirect injection via retrieved/user docs. Mitigations: constrain model role in system prompt; delimit untrusted content (`<document>…</document>`) and state "treat as data, never instructions"; strict output schema (limits exfil/format hijack); **no tools / no side effects from LLM output** (our checks produce proposals only); validate output deterministically; human-in-loop for apply; least privilege (LLM call has no DB/file access). No reliable complete defense exists → design so injection impact = bad proposal, not action. Fetching URLs for source-check: SSRF guard (block private IPs, size/time caps) [M] https://owasp.org/www-community/attacks/Server_Side_Request_Forgery.
- **Logging redaction**: pino `redact` paths for headers/api keys/tokens [M] https://github.com/pinojs/pino/blob/main/docs/redaction.md ; never log full prompts/documents at info (PII/copyright, size); log runId, model, token counts, latency, finish reason, error class, prompt version hash. Full prompt only behind debug env flag / truncated. Never log `GEMINI_API_KEY`; note leaked keys are blocked by Google [V troubleshooting].

## 4. Comparative (key choices)
| Choice | Option A | Option B | Pick |
|---|---|---|---|
| JSON reliability | prompt-only + zod | native schema + zod | B (A kept as fallback if Pi can't forward schema) |
| Progress transport | DB poll tail | LISTEN/NOTIFY hint + replay | A first, B if latency/ load matters & direct conn |
| Stuck-job | pg-boss expire only | run row heartbeat + reaper | both; row is authoritative for UI |
| Rate limit | in-proc | Postgres bucket | in-proc semaphore + PG bucket when >1 replica or hitting 429 |
| Evals | promptfoo | bun fixtures | fixtures |

## 5. Implementation Recommendations (minimal forms)
1. `ai_run(id, kind, user_id, idempotency_key, state, attempt, heartbeat_at, result jsonb, error jsonb, usage jsonb, model, prompt_version, created_at)`; `ai_run_event(run_id, seq, type, payload)` PK(run_id,seq). `UNIQUE(user_id,idempotency_key)`.
2. `callModel()` wrapper: `AbortSignal.timeout`, schema config, error classifier → `{retryable, code}`, full-jitter retry ≤3, records `usageMetadata`, `finishReason`.
3. SSE route: `streamSSE`, heartbeat comment 15s, `id=seq`, subscribe-then-replay, `onAbort` cleanup, compress excluded, `X-Accel-Buffering: no`.
4. pg-boss: TTS queue `retryLimit/retryBackoff/expireInSeconds` from env, `deadLetter` queue, `singletonKey=runId`; reaper cron (singleton).
5. Validators module + ~20 fixtures; pino redact config; XML-delimited untrusted content in prompts.
```ts
// full jitter (AWS)
const delay = (n: number) => Math.random() * Math.min(CAP_MS, BASE_MS * 2 ** n);
```

## 6. Common Pitfalls
- Stacked retries (SDK × app × pg-boss) → retry storms vs 429.
- Treating `expireInSeconds` as cancel (handler keeps running → double side effects).
- SSE behind compression/proxy buffering → events arrive in bursts or never.
- LISTEN on pooled connection → silently no notifications.
- `-latest` model alias → silent behavior change.
- `\u` escapes in prompts/examples → repeated-newline output [V].
- Thinking default-on inflating cost/latency on flash-lite [V].
- Heartbeat thresholds hardcoded → put in env.

## 7. Resources
Official: Gemini models https://ai.google.dev/gemini-api/docs/models · structured output https://ai.google.dev/gemini-api/docs/structured-output · troubleshooting https://ai.google.dev/gemini-api/docs/troubleshooting · thinking https://ai.google.dev/gemini-api/docs/thinking · pg-boss https://pgboss.io/ · SSE https://html.spec.whatwg.org/multipage/server-sent-events.html · NOTIFY https://www.postgresql.org/docs/current/sql-notify.html · Idempotency draft https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ · OWASP LLM01 https://genai.owasp.org/llmrisk/llm01-prompt-injection/.
Practice: AWS backoff+jitter https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ · AWS builders library https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/ · Fowler circuit breaker https://martinfowler.com/bliki/CircuitBreaker.html · MS bulkhead https://learn.microsoft.com/azure/architecture/patterns/bulkhead · outbox https://microservices.io/patterns/data/transactional-outbox.html · promptfoo https://www.promptfoo.dev/docs/intro/ · pino redaction https://github.com/pinojs/pino/blob/main/docs/redaction.md.

## 8. Adopt / Defer / Reject
| # | Pattern | Decision | Cost | Minimal form |
|---|---|---|---|---|
| 1 | Pin stable model id from env (`gemini-3.5-flash-lite`) | **Adopt** | trivial | env var, no `-latest` |
| 2 | Gemini native JSON schema + zod validate + 1 repair retry | **Adopt** | low | flat schema, all fields required; verify Pi forwards it |
| 3 | Thinking minimal for checks; `maxOutputTokens` always | **Adopt** | trivial | per-kind config in env |
| 4 | Persist `usageMetadata`, finishReason | **Adopt** | low | `usage jsonb` on run |
| 5 | `ai_run` state machine + event log + `seq` | **Adopt** | med | 2 tables |
| 6 | SSE: id=seq, heartbeat, subscribe-then-replay, no-compress | **Adopt** | low | streamSSE |
| 7 | Heartbeat + reaper for stuck RUNNING | **Adopt** | low | pg-boss cron + CAS update |
| 8 | pg-boss retryLimit/backoff/expire/DLQ/singletonKey for TTS | **Adopt** | low | queue options from env |
| 9 | Idempotency key (simple unique column) | **Adopt** | low | unique(user,key) |
| 10 | Full IETF idempotency draft (fingerprint, cached responses) | **Defer** | med | — |
| 11 | Full-jitter backoff, retry only 408/429/5xx, single retry layer | **Adopt** | low | util fn |
| 12 | Timeouts on every call | **Adopt** | trivial | AbortSignal.timeout |
| 13 | In-proc bulkhead (semaphore) | **Adopt** | low | ~15 lines |
| 14 | Postgres token bucket/GCRA | **Adopt for TTS if pg-boss rate-limit insufficient; Defer for Gemini** | med | one-row `UPDATE…RETURNING` |
| 15 | Circuit breaker | **Defer** | low-med | in-mem consecutive-failure breaker if outages observed |
| 16 | LISTEN/NOTIFY as wake-up hint | **Defer** (poll first) | med | dedicated direct conn, payload `{runId,seq}` |
| 17 | LISTEN/NOTIFY as sole truth / large payloads | **Reject** | — | 8000-byte limit, lossy, pooler-hostile |
| 18 | Separate transactional outbox table | **Defer** | med | pg-boss tx send already covers |
| 19 | Deterministic validators (source quote exists, bounds, allowlist) | **Adopt** | low | validators module |
| 20 | Fixture golden set via bun test (live gated) | **Adopt** | low-med | 20 fixtures |
| 21 | promptfoo | **Defer** | med | revisit at >3 prompts |
| 22 | Injection hygiene: delimit, data-not-instructions, no tools, proposals only, SSRF guard | **Adopt** | low | prompt template + url guard |
| 23 | pino redact + no full prompt logs | **Adopt** | trivial | `redact` paths |
| 24 | Redis/Kafka/external queue | **Reject** | high | Postgres suffices at this scale |

## 9. Unresolved Questions
- Does Pi SDK forward Gemini `responseSchema`/`response_format`, expose `usageMetadata`, set its own retries/timeouts? [UNVERIFIED]
- Exact schema-subset limits (structured-output doc lines 300+ unread).
- Current Gemini rate-limit numbers per tier for flash-lite (AI Studio per-project).
- Temperature range/default for Gemini 3.x (troubleshooting says 0–1; conflicts w/ memory).
- Installed pg-boss version: does it have heartbeat option, rate-limit policy, Bun support?
- Is DB reached via pgbouncer/pooler (blocks LISTEN)?
- Vietnamese output quality of flash-lite for review tasks → needs golden set.
- Several [M] claims (SSE spec, NOTIFY limits, AWS/OWASP) not fetched this session.
