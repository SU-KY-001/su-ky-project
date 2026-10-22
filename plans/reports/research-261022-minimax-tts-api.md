# Research Report: MiniMax TTS API for Sử Ký podcast CMS (Hono/Bun backend)

Date: 2026-10-22. Author: MinimaxTtsResearch. No source code edited.

## Executive Summary

MiniMax has two relevant HTTP paths: **sync** `POST /v1/t2a_v2` (<10,000 chars/call, hex or 24h URL, optional streaming, subtitles incl. word-level) and **async** `POST /v1/t2a_async_v2` (text ≤50,000 chars, or uploaded file ≤1M chars; poll → file_id → download; 9h URL expiry; sentence-level subtitle file). Auth = plain `Authorization: Bearer <API_key>`; no GroupId in current specs. Pricing: speech-2.8-hd $100/M chars (= $0.10 / 1k), speech-2.8-turbo $60/M. 30k-char script ≈ $3.00 hd / $1.80 turbo.

Vietnamese: officially one of 40 supported languages, `language_boost: "Vietnamese"` exists. BUT the system voice list I could see has exactly **one** Vietnamese-labelled voice (`Vietnamese_kindhearted_girl`). Major risk for a "default narrator + optional second narrator" feature: voice choice for Vietnamese is thin → second narrator likely needs Voice Design / Voice Clone / cross-language voices [UNVERIFIED quality].

No native multi-speaker/dialogue mode found in any fetched page (`timbre_weights` is voice *mixing*, max 4 voices, not turn-taking). Two-narrator mode = app-side: split script into per-speaker segments, synth each with own `voice_id`, concatenate audio (ffmpeg) and offset subtitle timings app-side.

Recommendation (ranked): (1) **async w/ `text` ≤50k** for full-episode render (fits 3k–30k scripts in ONE task; no chunk stitching for single narrator); (2) **sync per-segment** for preview/short and for two-narrator mode (many small calls, 60 RPM cap); (3) async file/zip only if >50k (YAGNI for this project).

## Research Methodology
- Sources consulted: 16 official MiniMax doc pages (markdown/OpenAPI alternates of platform.minimax.io/docs), all fetched 2026-10-22. No third-party sources → single-vendor; credibility high for params (OpenAPI spec), lower for behavior (latency, quality) = untested.
- Tool-call budget: 4 parallel doc reads + 1 scripted batch fetch (16 pages) + local file reads.
- Terms: t2a_v2, t2a_async_v2, query, files/retrieve, get_voice, voice_clone, voice_design, errorcode, rate-limits, pricing, subtitle_type, language_boost.

## Key Findings

### 1. Endpoint table (base `https://api.minimax.io`)

| Purpose | Method + path | Notes | Source |
|---|---|---|---|
| Sync TTS | POST `/v1/t2a_v2` | text <10k chars; `stream` true/false | [speech-t2a-http](https://platform.minimax.io/docs/api-reference/speech-t2a-http.md) |
| Async create | POST `/v1/t2a_async_v2` | `text` ≤50k OR `text_file_id` (txt/zip, ≤1M) | [async-create](https://platform.minimax.io/docs/api-reference/speech-t2a-async-create.md) |
| Async query | GET `/v1/query/t2a_async_query_v2?task_id=` | status processing/success/failed/expired; **max 10 QPS** | [async-query](https://platform.minimax.io/docs/api-reference/speech-t2a-async-query.md) |
| File retrieve (metadata + download URL) | GET `/v1/files/retrieve?file_id=` | example response has `file.download_url` (not in schema props – inconsistency) | [file-retrieve](https://platform.minimax.io/docs/api-reference/file-management-retrieve.md) |
| File content (raw bytes) | GET `/v1/files/retrieve_content?file_id=` | binary body | [file-content](https://platform.minimax.io/docs/api-reference/file-management-retrieve-content.md) |
| File upload (txt input for async, clone audio) | POST `/v1/files/upload` (multipart, `purpose=t2a_async_input` / `voice_clone` / `prompt_audio`) | | [async-guide](https://platform.minimax.io/docs/guides/speech-t2a-async.md), [clone-guide](https://platform.minimax.io/docs/guides/speech-voice-clone.md) |
| List voices | POST `/v1/get_voice` body `{voice_type: system\|voice_cloning\|voice_generation\|all}` | returns `system_voice[]`, `voice_cloning[]`, `voice_generation[]` | [voice-management-get](https://platform.minimax.io/docs/api-reference/voice-management-get.md) |
| Voice clone | POST `/v1/voice_clone` | see §Voice | [voice-cloning-clone](https://platform.minimax.io/docs/api-reference/voice-cloning-clone.md) |
| Voice design | POST `/v1/voice_design` `{prompt, preview_text≤500, voice_id?}` | | [voice-design](https://platform.minimax.io/docs/api-reference/voice-design-design.md) |
| WS sync / bidi | `wss://api.minimax.io/ws/v1/t2a_v2` , `/ws/v1/t2a_v2_bidi` | not needed for us | [ws guide](https://platform.minimax.io/docs/guides/speech-t2a-websocket.md) |

**Regional**: `api.minimax.io` (global) and `api-uw.minimax.io` (US West, lower TTFA) for the 3 sync TTS APIs ([ws guide §Endpoints](https://platform.minimax.io/docs/guides/speech-t2a-websocket.md)). `api.minimaxi.chat` / `api.minimaxi.com`: **not mentioned in any fetched page** → [UNVERIFIED], treat as legacy/CN; use `api.minimax.io`. Make base URL an env var.

**Auth**: `Authorization: Bearer <API_key>` (securityScheme http/bearer; key from platform Account Management > API Keys) — [async-query securitySchemes](https://platform.minimax.io/docs/api-reference/speech-t2a-async-query.md). `GroupId` query param: absent from all current OpenAPI specs (grep of fetched pages found none) → not required. Error 1004 text "token not match group" is a legacy message ([errorcode](https://platform.minimax.io/docs/api-reference/errorcode.md)). Keys on M Plan (subscription) are different: code 2057 "not token plan token".

### 2. Request fields (sync `t2a_v2`; async deltas flagged)

| Field | Spec | Source |
|---|---|---|
| `model` (req) | speech-2.8-hd, 2.8-turbo, 2.6-hd, 2.6-turbo, 02-hd, 02-turbo, 01-hd, 01-turbo | sync + async specs |
| `text` (req/or file) | sync <10,000 chars; >3,000 → streaming recommended; `\n` = paragraph break. Async: ≤50,000 | specs |
| `stream`, `stream_options.exclude_aggregated_audio` | sync only | sync spec |
| `voice_setting.voice_id` (req) | system/cloned/designed id; or leave empty + `timbre_weights` | spec |
| `voice_setting.speed` | [0.5, 2], default 1 | spec |
| `voice_setting.vol` | (0, 10], default 1 | spec |
| `voice_setting.pitch` | int [-12, 12], default 0 | spec |
| `voice_setting.emotion` | happy, sad, angry, fearful, disgusted, surprised, calm, fluent, whisper. All 8 model families accept `emotion`; `fluent`/`whisper` only 2.6-hd/2.6-turbo; **2.8 models do NOT support `whisper`**. Default = model auto-picks from text (recommended) | spec |
| `voice_setting.text_normalization` | deprecated (sync) → use top-level `text_normalization_mode: basic\|quality`; `quality` = LLM hybrid, non-stream + 2.8/2.6 only, extra latency. Async spec instead has `voice_setting.english_normalization` and NO `text_normalization_mode` | specs, [ws guide §Text Normalization](https://platform.minimax.io/docs/guides/speech-t2a-websocket.md) |
| `language_boost` | enum incl. `Vietnamese`, `auto`; default null | spec |
| `pronunciation_dict.tone` | `string[]`, each `"original/replacement"`; replacement = plain text, pinyin+tone num in `()`, IPA in `()`, Japanese kana. e.g. `"omg/oh my god"`, `"resume/(rɪˈzjuːm)"`. Applied simultaneously. Doc shows no Vietnamese-specific form; plain-text respelling is the only Vietnamese-applicable option [INFERENCE] | spec |
| Inline pronunciation | `(pinyin)`/`(IPA)`/`(jyutping)` in text — Mandarin/Cantonese/IPA only | sync spec |
| Pause marker | `<#x#>`, x seconds in [0.01, 99.99], ≤2 decimals; must sit between speakable text, no consecutive markers. Sync text field + async **txt file** documented; async inline `text` field description does not mention it [UNVERIFIED for inline async `text`] | specs |
| Interjection tags | `(laughs)`, `(sighs)`, `(breath)` … 2.8-hd/turbo only (async lists a few more: `(whistles)`,`(crying)`,`(applause)`) — English tag names, Vietnamese behavior [UNVERIFIED] | specs |
| `audio_setting` | sample_rate {8000,16000,22050,24000,32000,44100}; bitrate {32k,64k,128k,256k} (mp3 only); format mp3/pcm/flac/wav/pcmu_raw/pcmu_wav/opus; channel 1/2. **Sync key `sample_rate`, async key `audio_sample_rate`; async default channel = 2 (stereo), sync default 1** | specs |
| `voice_modify` | pitch/intensity/timbre [-100,100], `sound_effects` spacious_echo/auditorium_echo/lofi_telephone/robotic. Async: only mp3/wav/flac | specs |
| `timbre_weights` | up to 4 voices, weight [1,100] = mix, not dialogue | sync spec |
| `subtitle_enable`, `subtitle_type` | sync only in schema; `sentence` (default) / `word` / `word_streaming`(stream only) | sync spec |
| `output_format` | `hex` (default) or `url`; url only non-streaming, **valid 24h**; streaming = hex only | sync spec |

### 3. Response fields

Sync (non-stream): `data.audio` (hex; **may be null → null-check**), `data.status` (1 synthesizing / 2 done), `data.subtitle_file` (download URL, JSON, sentence ≤50 chars, ms timestamps; non-stream only), `extra_info.{audio_length ms, audio_sample_rate, audio_size, bitrate, audio_format, audio_channel, usage_characters, word_count, invisible_character_ratio, usage_voice_count?, norm_text_char_count?}`, `trace_id`, `base_resp.{status_code,status_msg}`. Streaming: SSE-like chunks, `data.subtitle` per segment, `data.subtitles[]` aggregated on last (status=2) packet; last chunk contains full aggregated audio unless `exclude_aggregated_audio`. Source: [sync spec](https://platform.minimax.io/docs/api-reference/speech-t2a-http.md).

Subtitle shape (`T2ASubtitle`): `{text, text_begin, text_end (char offsets), time_begin, time_end (ms), timestamped_words?[{word, word_begin, word_end, time_begin, time_end}]}`. Word-level = YES in sync (`subtitle_type: word`).

Async create resp: `task_id` (spec says string; query takes int64), `file_id` (int64, returned immediately at create), `task_token`, `usage_characters`, `base_resp`. Query resp: `task_id`, `status` (`success|failed|expired|processing` — doc prose capitalised "Success", example shows `"Processing"`; **compare case-insensitively**), `file_id`, `base_resp`. Output files per input: audio + **sentence-level subtitle** + extra JSON; zip with multiple files → folder per file ([async-create](https://platform.minimax.io/docs/api-reference/speech-t2a-async-create.md)). Download URL valid **9h (32,400 s)** from generation, afterwards "generated data will be lost" ([async-query](https://platform.minimax.io/docs/api-reference/speech-t2a-async-query.md)). → Download immediately on `success` and re-host in Cloudinary/MediaAsset (matches existing flow).

Async subtitle opt-in flag: not in the async request schema; docs just say subtitle is returned. How to fetch the subtitle file by id (separate file_id? inside archive?) is **[UNVERIFIED]** — async-create/query only expose one `file_id`. Need a live test.

### 4. Voices
- `get_voice` lists all voices for account (system + cloned + designed). Cloned/designed appear only after first successful synth ([voice-management-get](https://platform.minimax.io/docs/api-reference/voice-management-get.md)). No language filter param in request (only `voice_type`) → filter Vietnamese client-side by `voice_id` prefix `Vietnamese_` / description [INFERENCE].
- Static list ([System Voice ID List](https://platform.minimax.io/docs/faq/system-voice-id.md)): grep shows exactly one Vietnamese: `Vietnamese_kindhearted_girl` ("Kind-hearted girl"). Live `get_voice` may return more [UNVERIFIED]. Many voices are language-agnostic multilingual? Doc doesn't say cross-lingual works well with Vietnamese text → listening test needed.
- Voice clone ([voice-cloning-clone](https://platform.minimax.io/docs/api-reference/voice-cloning-clone.md)): upload src audio (mp3/m4a/wav, 10s–5min, ≤20MB), optional prompt audio <8s + transcript; custom `voice_id` 8–256 chars, starts with letter; cloned voice **deleted if unused 7 days**; $1.50/voice charged at first synth; error `2038` = identity verification (individual/business) required in Account Management; `1046` identity-policy rejection for prompts; `2052` no voice slot. Docs fetched give **no explicit consent/legal text** — only the identity-verification gate. Our product must collect own consent evidence for any cloned human voice (Vietnamese historical figure mimicry = legal/ethical risk) [INFERENCE].
- Voice design ([voice-design](https://platform.minimax.io/docs/api-reference/voice-design-design.md)): prompt → `voice_id`; $3/voice on first synth; preview ≤500 chars; preview billed $30/M per spec (pricing page says $60/M — **doc conflict**). Prompt language support for Vietnamese voice [UNVERIFIED]. 1046 rejects identity claims in prompt (don't write "giọng Bác Hồ").

### 5. Errors & retry classification ([errorcode](https://platform.minimax.io/docs/api-reference/errorcode.md); doc says HTTP 200 + `base_resp.status_code`; HTTP-level statuses not documented → check both)

| Class | Codes | Action |
|---|---|---|
| Retryable, backoff+jitter | 1000 unknown, 1001 timeout, 1002 RPM, 1024 internal, 1033 system, 1039 TPM, 2064 high load, 2066 proc. timeout | retry ≤N, exp. backoff; honor 60 RPM |
| Retryable but "wait" semantic | 1045 task concurrency (async) | queue; re-submit when running tasks finish; limit unknown [UNVERIFIED] |
| Retry with throttle / smoothing | 2045 rate growth, 2046 token growth, 2047 conn growth | ramp requests gradually, avoid bursts |
| Retry later (quota window) | 2056 usage limit (5h window, M Plan), 2062 M Plan rate | only relevant on M Plan keys |
| Non-retryable (fix input) | 2013 invalid params, 2014 empty input, 1042 >10% invisible chars, 1026/1027 content sensitivity (input/output), 2054/20132/2042/2043 voice_id issues, 2022/2069 model missing/removed | surface to mod, don't retry |
| Non-retryable (ops/config) | 1004, 2049 auth/key invalid, 1008/2053 balance, 2038 verification, 2052 slots, 2057/2061/2068 plan | alert ops |

Note: 1026/1027 content moderation can hit Vietnamese history scripts (war/violence topics) → needs mod-facing error UX. Always log `trace_id`.

### 6. Rate limits & pricing
- T2A RPM = **60** (all speech-2.8/2.6/02 models); Voice Clone 60; Voice Design 20; TPM/CONN "——" (none listed) ([rate-limits](https://platform.minimax.io/docs/guides/rate-limits.md)). Audio Subscription packages raise RPM (10/50/200/500…) and cap voice slots ([pricing](https://platform.minimax.io/docs/pricing/overview.md)); async task concurrency limit not documented [UNVERIFIED]. Async query 10 QPS.
- Pricing pay-as-you-go ([pricing](https://platform.minimax.io/docs/pricing/overview.md)): speech-2.8-hd **$100/M chars** sync & async; speech-2.8-turbo **$60/M**; legacy 2.6/02 same ($100/$60). Cost per 1k chars: $0.10 / $0.06. Script 3k → $0.30/$0.18; 30k → $3.00/$1.80. `usage_characters` is billing unit (differs from `word_count`); how it counts Vietnamese diacritics/spaces/markers [UNVERIFIED] — budget from returned `usage_characters`.

### 7. Multi-speaker
No native dialogue/multi-speaker param in sync, async, or WS guide (grep for dialog/speaker/multi in WS guide: no hits; `timbre_weights` = mixing). Async json-in-zip has `title`/`content`/`extra` fields — each synthesized as separate files, same voice per task; not speakers. Conclusion: alternating narrators = N separate synth calls + app-side concat. Boundary gap: insert `<#0.3#>`-style pause or ffmpeg silence [INFERENCE]. Emotion/prosody consistency across stitched segments with same voice is a quality risk.

## Chunking strategy for 3k–30k Vietnamese chars

| Script size | Single narrator | Two narrators |
|---|---|---|
| ≤3k | sync non-stream, `output_format: url` or hex | per-turn sync calls |
| 3k–10k | sync **stream** (recommended by docs >3k) or async | per-turn sync; merge turns |
| 10k–50k | **async `text`** one task (≤50k) | per-turn sync (each turn <10k) in parallel ≤ ~RPM budget, or async per block; concat |
| >50k | upload txt → `text_file_id` (≤1M) | — (YAGNI) |

Notes:
- Cut at paragraph boundaries (`\n`), never mid-sentence; sentence-level subtitle gives natural seams.
- Preserve consistency when splitting a single narrator: same voice_id/speed/emotion on every chunk; avoid `emotion` unless required (auto is default); 2.8 has no whisper.
- Two-narrator speaker markup is app-defined (Tiptap node attr) → serialize to ordered `[{speaker, text}]`; subtitle time offset for turn k = sum(audio_length of previous turns + gaps) (from `extra_info.audio_length`).
- Concurrency: stay under 60 RPM total incl. retries; use p-limit (suggest env `MINIMAX_TTS_CONCURRENCY`, default small e.g. 3–4 [INFERENCE]); async 1045 → queue.
- Persist `task_id`/`file_id` in DB immediately; pollers must survive restart; download within 9h; re-host audio; store `usage_characters` for cost.

## Code examples (Node 18+/Bun fetch; no deps)

```ts
const BASE = process.env.MINIMAX_API_BASE ?? "https://api.minimax.io";
const headers = {
  Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
  "Content-Type": "application/json",
};

class MinimaxError extends Error {
  constructor(public code: number, msg: string, public traceId?: string) { super(`${code} ${msg}`); }
}
const RETRYABLE = new Set([1000, 1001, 1002, 1024, 1033, 1039, 2064, 2066, 2045, 2046, 2047]);
export const isRetryable = (e: unknown) => e instanceof MinimaxError && RETRYABLE.has(e.code);

// ---- SYNC (<10k chars) ----
export async function ttsSync(text: string, voiceId: string): Promise<Buffer> {
  const res = await fetch(`${BASE}/v1/t2a_v2`, {
    method: "POST", headers, signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model: "speech-2.8-hd", text, stream: false, output_format: "hex",
      language_boost: "Vietnamese",
      voice_setting: { voice_id: voiceId, speed: 1, vol: 1, pitch: 0 },
      audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);          // HTTP errors undocumented -> treat 429/5xx retryable upstream
  const j = await res.json();
  if (j.base_resp.status_code !== 0) throw new MinimaxError(j.base_resp.status_code, j.base_resp.status_msg, j.trace_id);
  if (!j.data?.audio) throw new MinimaxError(-1, "null data.audio", j.trace_id); // docs: data may be null
  return Buffer.from(j.data.audio, "hex");
}

// ---- ASYNC (10k-50k chars) ----
export async function ttsAsync(text: string, voiceId: string): Promise<Buffer> {
  const c = await (await fetch(`${BASE}/v1/t2a_async_v2`, {
    method: "POST", headers,
    body: JSON.stringify({
      model: "speech-2.8-hd", text, language_boost: "Vietnamese",
      voice_setting: { voice_id: voiceId, speed: 1, vol: 1, pitch: 0 },
      audio_setting: { audio_sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 },
    }),
  })).json();
  if (c.base_resp.status_code !== 0) throw new MinimaxError(c.base_resp.status_code, c.base_resp.status_msg);
  // persist c.task_id + c.file_id to DB here

  const deadline = Date.now() + 30 * 60_000;                    // timeout value = our choice; docs give no ETA
  for (let delay = 3_000; Date.now() < deadline; delay = Math.min(delay * 1.5, 15_000)) {
    await new Promise(r => setTimeout(r, delay));               // stay far under 10 QPS
    const q = await (await fetch(`${BASE}/v1/query/t2a_async_query_v2?task_id=${c.task_id}`, { headers })).json();
    if (q.base_resp.status_code !== 0) throw new MinimaxError(q.base_resp.status_code, q.base_resp.status_msg);
    const s = String(q.status).toLowerCase();
    if (s === "failed" || s === "expired") throw new Error(`async task ${s}`);
    if (s === "success") {
      const r = await fetch(`${BASE}/v1/files/retrieve_content?file_id=${q.file_id}`, { headers }); // within 9h
      if (!r.ok) throw new Error(`download HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    }
  }
  throw new Error("async task poll timeout");
}
```
Unverified in code: whether `retrieve_content` returns the audio directly vs a zip/folder for async output (async-create describes audio+subtitle+extra files) — if zip, unzip needed; fallback `files/retrieve` → `download_url`. Test live.

## Security
- API key server-side only (env/secret manager); never to browser. Log `trace_id`, never key/script text beyond hash/length.
- Content moderation (1026/1027) and 1046 identity policy: handle as user-facing validation errors.
- Clone/design: require own consent record; identity verification (2038) on the MiniMax account.
- Download URLs are expiring; don't store as permanent links.

## Risks/unknowns for Vietnamese podcast
1. **Voice inventory**: one `Vietnamese_*` system voice seen in static list; second narrator choice unclear → test `get_voice`, test Vietnamese text on multilingual voices, or Voice Design/Clone ($3/$1.5 per voice, slots, 7-day idle deletion → need keep-alive or re-create strategy).
2. **Quality unknowns**: Vietnamese tones/diacritics, historical proper nouns (names, Hán-Việt terms, dates/numbers) — `pronunciation_dict` only documented for pinyin/IPA/kana/plain-text; no Vietnamese rules. `text_normalization_mode: quality` described for "Chinese/English" in deprecated field; Vietnamese number normalization coverage [UNVERIFIED]. Mitigate: pre-expand numbers/dates in app before sending; maintain Vietnamese respelling dictionary.
3. **Emotion**: model-auto default; manual emotion on Vietnamese effect [UNVERIFIED]; `whisper` unavailable on 2.8.
4. **Interjection tags** are English tokens; reading in Vietnamese context [UNVERIFIED].
5. **Pause markers** in async inline `text` not documented (only txt file) → test or use sync/newlines.
6. **Async subtitle retrieval** mechanism unclear; async param naming differs from sync (`audio_sample_rate`, default channel 2, `english_normalization`). Don't share one request builder blindly.
7. **Seam artifacts** for stitched chunks / two narrators (loudness, prosody, silence); needs ffmpeg loudnorm [INFERENCE].
8. **Moderation false positives** on war/political history content.
9. **Doc inconsistencies**: voice-design preview $30/M vs pricing $60/M; async `task_id` string vs int; status casing; `download_url` missing from retrieve schema. Code defensively.
10. **Operational**: 60 RPM shared with previews; async concurrency limit unknown; no documented HTTP-level retry/Retry-After header; no SLA/ETA for async; 9h URL expiry means a down poller can lose audio.
11. **Single-vendor**: no independent benchmarks consulted; vendor lock-in; model deprecation (2069 "model no longer available") → keep model id in config.
12. **Legal**: TOS/privacy/data retention of submitted scripts not read ([terms](https://platform.minimax.io/docs/guides/terms-of-service.md), [privacy](https://platform.minimax.io/docs/guides/privacy-policy.md)) [UNVERIFIED]; content licensing of generated audio for commercial podcast not verified.

## Implementation Recommendations
1. Config (env): `MINIMAX_API_KEY`, `MINIMAX_API_BASE`, `MINIMAX_TTS_MODEL` (default `speech-2.8-hd`), concurrency, poll timeout.
2. Service in `apps/api`: `synthesize({text, voiceId, params})` choosing sync (<10k) vs async (≥10k) by length; return audio Buffer → feed existing MediaAsset/Cloudinary + `PUT /episodes/:id/narrations/:type/audio` flow.
3. Persist job rows (task_id, file_id, status, usage_characters, trace_id) so polling survives restarts; background poller, not request-bound.
4. Voice picker: cache `get_voice` (system) server-side; expose Vietnamese-first filter; preview via short sync call (≤ few hundred chars, billed).
5. Two-narrator: serialize turns → per-turn sync calls → ffmpeg concat with small silence → single audio; offset subtitles.
6. Before building UI: run a 1-hour live spike with a real 3k and 25k Vietnamese script: voices list, tones, numbers, async output shape (zip?), subtitle retrieval, 1045 limit.

## Resources & References
- Doc index: https://platform.minimax.io/docs/llms.txt
- Sync T2A: https://platform.minimax.io/docs/api-reference/speech-t2a-http.md
- Async create: https://platform.minimax.io/docs/api-reference/speech-t2a-async-create.md
- Async query: https://platform.minimax.io/docs/api-reference/speech-t2a-async-query.md
- Async guide: https://platform.minimax.io/docs/guides/speech-t2a-async.md
- File retrieve / content: https://platform.minimax.io/docs/api-reference/file-management-retrieve.md , https://platform.minimax.io/docs/api-reference/file-management-retrieve-content.md
- Get voice: https://platform.minimax.io/docs/api-reference/voice-management-get.md ; system voice list: https://platform.minimax.io/docs/faq/system-voice-id.md
- Voice clone/design: https://platform.minimax.io/docs/api-reference/voice-cloning-clone.md , https://platform.minimax.io/docs/api-reference/voice-design-design.md , https://platform.minimax.io/docs/guides/speech-voice-clone.md
- Errors: https://platform.minimax.io/docs/api-reference/errorcode.md ; rate limits: https://platform.minimax.io/docs/guides/rate-limits.md ; pricing: https://platform.minimax.io/docs/pricing/overview.md
- WS guide (models, languages, normalization, endpoints): https://platform.minimax.io/docs/guides/speech-t2a-websocket.md

## Unresolved Questions
1. Does live `POST /v1/get_voice {voice_type:"system"}` return >1 Vietnamese voice? Which multilingual voices read Vietnamese acceptably?
2. Does async output come as a single audio via `retrieve_content`, or zip/folder with subtitle + extra JSON? How to get the subtitle file id?
3. Are `<#x#>` pause markers honored in async inline `text`?
4. Async concurrent-task limit (code 1045 threshold) and typical latency for 30k chars?
5. Exact billing count (`usage_characters`) for Vietnamese text with diacritics/markers?
6. Is `api.minimaxi.chat` still valid / relevant outside China; is GroupId ever needed for older keys?
7. HTTP status mapping (429/5xx) and any `Retry-After` header — undocumented.
8. Vietnamese support for `text_normalization_mode: quality`, emotion, interjection tags.
9. Consent/legal requirements for voice clone beyond identity verification; TOS on commercial podcast use of generated audio.
10. Voice design $30/M vs $60/M preview price conflict — which is current?
