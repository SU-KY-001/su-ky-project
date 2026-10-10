---
title: "Studio CRUD series/episode + Thời kỳ→Giai đoạn + nguồn series-level; AI chuyển sang vai trò engine trợ lý"
description: "Mod kiểm soát 100% qua CRUD. Giữ AI engine (pi runtime + structured agent runner) làm module không nối logic chính để sau tích hợp theo hướng trợ lý/review. Pipeline workflow AI-first (bảng, route, importer, UI) chuyển thành archive. Xóa EpisodeSource, historicalPeriodId, audioProvider."
status: in-progress
priority: P1
effort: ~42h
branch: main
tags: [prisma, hono, studio, react, cloudinary, cleanup]
blockedBy: []
blocks: []
created: 2026-10-10
---

Nguồn quyết định: `plans/reports/brainstorm-261010-studio-crud-and-period-hierarchy.md`. Hai plan cũ (`261008-1900-...backend`, `261009-0010-...script-workflow-frontend`) là kiến trúc bị thay thế; chuyển status sang `superseded` ở Phase 0.

## Nguyên tắc
- **Clean cutover cho kiến trúc cũ**: EpisodeSource, historicalPeriodId, audioProvider xóa hẳn (code, route, table, cột, enum, test, doc). Không alias, không shim, không comment "deprecated".
- **AI = trợ lý, mod là trung tâm.** Tách đôi script-workflow theo bản chất:
  - **AI engine (GIỮ, code sống trong `apps/api`)**: phần generic gọi LLM + ép schema. Không route, không bảng, không import từ content/catalog/listening, không khởi động lúc boot.
  - **Workflow AI-first (ARCHIVE)**: 7 bước + 3 cổng duyệt, hàng đợi, bảng workflow, importer vào CMS, publication, UI. Chất xám của chủ dự án, lưu tĩnh ngoài build.
- DB chưa có dữ liệu thật → migration mới **drop thẳng**, không backfill, không sửa migration `init`.
- Mỗi phase kết thúc: `bun run typecheck` + `bun test` xanh, và `grep` bằng chứng không còn tham chiếu symbol đã xóa trong `apps/` và `packages/`.

## Tách AI engine và workflow
### A. AI engine: giữ tại `apps/api/src/modules/ai-engine/`
Đã grep: `pi-runtime.ts` (69 dòng) và `structured-agent-runner.ts` (265 dòng) chỉ phụ thuộc `core/env`, `core/logger`, constants và `AgentValidationError`; `runStructuredAgent(schema, prompt, ...)` là generic. Coupling với workflow chỉ nằm ở `pi-tracer.ts` (ghi event qua `ScriptWorkflowRepository`) và `pi-step-agent.ts` (map step → prompt).
```
ai-engine/
  pi-runtime.ts              # init LAZY ở lần gọi đầu (không còn piRuntime.init() lúc boot)
  structured-agent-runner.ts # runStructuredAgent({ systemPrompt, userPrompt, schema, tools?, onEvent? })
  pi-tracer.ts               # đổi sink: ghi `logger` + callback `onEvent` tùy chọn, bỏ ScriptWorkflowRepository
  schema-retry.prompt.ts     # từ script-workflow/infrastructure/prompts
  errors.ts                  # AgentValidationError (tách khỏi domain/step-agent.ts)
  ai-engine.constants.ts     # DEFAULT_PI_MODEL_BY_PROVIDER, PI_MODEL_REFRESH_TIMEOUT_MS, MAX_AGENT_RETRY_COUNT
  index.ts                   # chỉ export runStructuredAgent, aiEngine.isReady()
```
Quy tắc cứng (grep làm cổng ở Phase 0 và 5):
- Không có route, không bảng DB, không gắn vào `app.ts`/`index.ts`.
- `content`, `catalog`, `listening`, `media`, `auth` **không** import `ai-engine`. Khi tích hợp trợ lý sau này, đó là một module mới (`ai-assistant`) gọi engine, theo plan riêng.
- Giữ dep `@earendil-works/pi-coding-agent`, `pi-web-access`, `zod-to-json-schema`; giữ env `PI_*`, `GEMINI_API_KEY`, `OPENCODE_API_KEY` (đều optional, thiếu key không làm API lỗi vì không init lúc boot).
- Engine có test riêng `tests/ai-engine.test.ts` cho phần không cần LLM thật (retry khi sai schema, ném `AgentValidationError` sau N lần). Kiểm các test hiện có trong `script-workflow.test.ts` để tách phần thuộc engine.

### B. Workflow AI-first: archive tại `archive/script-workflow/`
Root `package.json` chỉ có workspaces `apps/*`, `packages/*`; `apps/api/tsconfig.json` chỉ include `src/**` và `tests/**`.
```
archive/script-workflow/
  README.md       # mục đích, "snapshot không chạy được", cách khôi phục, liên hệ với ai-engine
  api/            # script-workflow trừ phần đã chuyển sang ai-engine: agent-step.handler, lineage, publication, workflow-command/query, agent-job-queue, step-agent, pg-boss-agent-queue, pi-step-agent, step-prompt.mapper + prompts, repository, routes, content-import
  api-tests/      # script-workflow.test.ts, content-import.test.ts (đổi đuôi, xem dưới)
  shared/         # schemas/script-workflow/** + content/import.ts
  web/            # features/script-workflow + pages/moderator/script-workflows
  db/             # schema.fragment.prisma (6 model + enum) + create.sql
  deps.md         # ghi nhận env/dep dùng bởi workflow
```
Git tag `archive/script-workflow-v1` trên commit ngay trước Phase 0 giữ bản chạy được nguyên trạng.
**Chặn test/lint/tsc quét nhầm archive** (review: `bun test` quét đệ quy mọi `*.test.ts` từ cwd, `bunfig.toml` không có ignore): đổi đuôi mọi file test trong archive thành `*.test.ts.txt`; thêm `archive/` vào `exclude` của mọi tsconfig có thể với tới (root, nếu có) và ignore của công cụ lint nếu có (repo hiện không thấy biome/eslint ở root, kiểm lại khi làm). Verify: chạy `bun test` từ root và từ `apps/api`, kết quả không chứa đường dẫn `archive/`.
Đánh đổi: archive không chạy được ngay; muốn chạy lại phải đưa về `apps/api` và vá importer theo `SeriesSource`/`historicalPhaseId`, nối lại 6 bảng.

## Danh sách xóa/chuyển (đã grep, đây là phạm vi thật)
| Loại | Hành động |
|---|---|
| API module `script-workflow/**` | **Tách đôi**: engine → `ai-engine/` (giữ), phần còn lại → `archive/script-workflow/api` |
| API wiring | **Xóa** route `/api/script-workflows` trong `app.ts`; `startScriptWorkflowRuntime`/`stopScriptWorkflowRuntime` và fatal-check queue trong `index.ts`; `routes/docs/paths/script-workflow.ts`, mục trong `docs/index.ts`, `docs/schemas.ts`, `docs/AGENTS.md` |
| Health | `health.ts` hiện lấy `queue: running` từ `getScriptWorkflowRuntimeStatus()` (script-workflow queue). **Đổi** sang trạng thái của maintenance boss: thêm `isMaintenanceRunning()` trong `core/jobs/maintenance-jobs.ts`; bỏ field `ai`; sửa mô tả ở `system-auth.ts` và `SystemHealthDto` |
| Content module | **Xóa** `getAiOriginal`; `mappers` `origin`/`scriptPublication`/`pendingAiRuns`; `entity` `ScriptPublicationEntity`/`WorkflowRunEntity`/`workflowRuns`; `repository` `thirdPersonScript`, include `workflowRuns`, helpers transaction chỉ phục vụ importer |
| Listening | **Xóa** `scriptPublicationId`, `scriptPublicationEpisodeNo` |
| DB tables | **Drop** `WorkflowRun`, `WorkflowStep`, `StepVersion`, `WorkflowEvent`, `ScriptPublication` (DDL lưu ở `archive/.../db`); **drop** `EpisodeSource` |
| DB fields/enums | **Drop** `EpisodeNarration.scriptPublicationId`, `scriptPublicationEpisodeNo` + unique; `EpisodeNarration.audioProvider` + enum `AudioProvider`; `Series.historicalPeriodId`. **Giữ** `TagOrigin` và `EpisodeEntityTag.origin/status/confirmedBy` (pattern AI gợi ý → mod xác nhận, dùng cho trợ lý sau này) |
| Shared | **Chuyển** `schemas/script-workflow/**`, `schemas/content/import.ts` vào archive; bỏ export trong `index.ts`; bỏ `origin` ở `catalog.ts` |
| Web | **Chuyển** `features/script-workflow/**`, `pages/moderator/script-workflows/**` vào archive; xóa route `routeConfig.tsx`, mục `navItems.ts`, liên kết trong `ModeratorDashboard.tsx`; `IntegrationStatusCard` chỉ giữ nếu còn hiển thị hạng mục khác |
| Deps | **Giữ** `@earendil-works/pi-coding-agent`, `pi-web-access`, `zod-to-json-schema` (engine), `pg-boss` (maintenance jobs tự tạo `PgBoss` riêng, `index.ts:20` khởi động độc lập). **Gỡ** không dep nào ở phase này; nếu `pg-boss` chỉ còn maintenance thì vẫn giữ |
| Env | **Giữ** `PI_*`, `GEMINI_API_KEY`, `OPENCODE_API_KEY` trong `core/env.ts` và `.env.example` (đánh dấu "AI engine, optional") |
| Test | **Chuyển** `script-workflow.test.ts` (phần workflow), `content-import.test.ts` vào archive đổi đuôi `.txt`; phần test engine tách sang `tests/ai-engine.test.ts`; `narrative-selection.test.ts` kiểm trước, không liên quan AI thì giữ và sửa |
| Docs | Cập nhật `docs/api-docs`, `codebase-summary`, `project-roadmap`, `project-overview-pdr`, `apps/api/AGENTS.md`; plan cũ → `superseded` |
| Mobile | `features/citations`, `shared/schemas`, `shared/types` đổi theo contract mới, bỏ field AI |

## Phase 0 — Tách engine, archive workflow (làm TRƯỚC) · ~8h
1. Đặt git tag `archive/script-workflow-v1`.
2. Tạo `ai-engine/` bằng `git mv` các file engine; gỡ phụ thuộc vào `ScriptWorkflowRepository`/`StepType` (tracer dùng `logger` + `onEvent`; `AgentValidationError` và constants chuyển theo); `piRuntime` init lazy. Viết `tests/ai-engine.test.ts`.
3. Tạo `archive/script-workflow/` bằng `git mv` phần còn lại; viết `README.md`, `deps.md`, `db/schema.fragment.prisma` + `db/create.sql`; đổi đuôi test `.test.ts.txt`; thêm exclude tsconfig.
4. Gỡ wiring (app.ts, index.ts runtime AI + fatal-check queue, docs routes); migration `drop_script_workflow` drop 5 bảng + 2 cột narration + unique + `audioProvider`/enum, dọn relations ở `User`/`Series`.
5. Sửa `content.*`, `listening.*`, `health.ts` + `maintenance-jobs.ts` (`isMaintenanceRunning`), `index.ts` (giữ `startMaintenanceJobs`).
6. Verify: `bun run typecheck`, `bun test` (từ root và `apps/api`, không chạy file trong `archive/`), khởi động API **không có key AI**, `GET /health` trả `queue: running` từ maintenance boss, `GET /api/studio/series` chạy, `POST /api/script-workflows` trả 404. Grep: `apps/` và `packages/` không còn `script-workflow|scriptPublication|WorkflowRun`; không file ngoài `ai-engine/` import `ai-engine`.

## Phase 1 — Thời kỳ → Giai đoạn · ~7h
- `schema.prisma`: giữ `HistoricalPeriod` (Thời kỳ). Thêm `HistoricalPhase(id, periodId FK Restrict, name, slug unique, startYear, endYear, note, sortOrder, isActive)`. **Drop** `Series.historicalPeriodId`; thêm `historicalPhaseId` (FK Restrict, index, nullable ở DRAFT, **bắt buộc khi publish** qua `seriesChecklist`). Thời kỳ của series suy qua phase.
- **Quy ước năm (chốt)**: nửa kín `[startYear, endYear)` cho `HistoricalPeriod` và `HistoricalPhase`. `startYear` inclusive, `endYear` exclusive, `endYear = null` nghĩa là còn tiếp diễn ("đến nay"), `startYear = null` nghĩa là không xác định (tiền sử). Một năm thuộc khoảng khi `startYear <= year < endYear`. **Không bao giờ +1 năm để tránh giao nhau.** Năm TCN lưu số âm, không có năm 0 (1 TCN = -1, 1 SCN = 1); chỉ so sánh, không tính số năm bằng phép trừ.
- **Series giữ nguyên đóng** `[startYear, endYear]`: là mô tả sự kiện do mod gõ ("40–43" nghĩa là đến hết năm 43). Áp nửa kín cho series sẽ biến "Khởi nghĩa Hai Bà Trưng 40–43" thành 40–42, sai với sử học. Cảnh báo mềm dùng điều kiện giao nhau, không +1: series giao phase khi `series.startYear < phase.endYear && series.endYear >= phase.startYear` (null = vô cực). Ví dụ 40–43 vs phase I `[-179,43)` → giao (40<43 và 43>=-179), không cảnh báo.
- **Hiển thị**: UI giữ cách viết của sử học (vd "179 TCN – 43"), nhãn tooltip/`note` ghi "đến trước năm 43". Tầng dữ liệu là nguồn sự thật cho ý nghĩa của `endYear`.
- **Bất biến kiểm bằng test seed** (không cần exclusion constraint vì dữ liệu chỉ seed cứng): trong mỗi thời kỳ, phase đầu có `start` = `start` của thời kỳ, phase cuối có `end` = `end` của thời kỳ, `phase[i].end == phase[i+1].start` (liền mạch, không chồng, không hở); các thời kỳ nối liền `period[i].end == period[i+1].start`; `start < end` khi cả hai không null. Thêm `CHECK (start_year IS NULL OR end_year IS NULL OR start_year < end_year)` trong SQL migration.
- Chỉ lưu độ chính xác **năm**. Tháng/ngày là YAGNI; quy ước nửa kín vẫn đúng nếu sau này đổi cột sang date.
- **Seed đề xuất theo quy ước (chờ duyệt, nội dung theo `Thoiky-Giaidoan.md`)**. Chỗ `Thoiky-Giaidoan.md` ghi mốc cuối đóng (vd "43–541") được đổi sang cuối mở (542):

| Thời kỳ | Giai đoạn | `[start, end)` |
|---|---|---|
| 1 Tiền sử & Sơ sử `[null, -179)` | Tiền sử | `[null, -700)` |
| | Hồng Bàng - Văn Lang | `[-700, -208)` |
| | Thục Phán - Âu Lạc | `[-208, -179)` |
| 2 Bắc thuộc `[-179, 939)` | Bắc thuộc lần I | `[-179, 43)` |
| | Bắc thuộc lần II | `[43, 542)` |
| | Vạn Xuân | `[542, 602)` |
| | Bắc thuộc lần III & tự chủ | `[602, 939)` |
| 3 Quân chủ `[939, 1858)` | Sơ khai (Ngô, Đinh, Tiền Lê) | `[939, 1009)` |
| | Lý, Trần, Hồ | `[1009, 1407)` |
| | Chống Minh & Lê sơ | `[1407, 1527)` |
| | Phân liệt, nội chiến | `[1527, 1802)` |
| | Nhà Nguyễn độc lập | `[1802, 1858)` |
| 4 Cận đại `[1858, 1945)` | Pháp xâm lược & kháng chiến | `[1858, 1900)` |
| | Khai thác thuộc địa, chuyển biến | `[1900, 1930)` |
| | Chuẩn bị Cách mạng Tháng Tám | `[1930, 1945)` |
| 5 Hiện đại `[1945, null)` | Kháng chiến chống Pháp | `[1945, 1954)` |
| | Kháng chiến chống Mỹ | `[1954, 1975)` |
| | Thống nhất, Đổi mới | `[1975, null)` |

Mốc `1900` (cuối XIX/đầu XX) và `-700` (thế kỷ VII TCN) là mốc **mình đề xuất** vì tài liệu chỉ ghi thế kỷ; team duyệt trước khi seed. Hai chỗ tài liệu mâu thuẫn (thời kỳ 3 ghi cả 1945 lẫn 1858) đã giải quyết bằng `[939,1858)` + `[1858,1945)`.
- Catalog: `GET /studio/historical-periods` và public trả cây period→phases. Sửa catalog.{service,entity,repository,routes}, `docs/paths/catalog.ts`.
- Series create/patch nhận `historicalPhaseId`. Sửa shared `series.ts`/`catalog.ts`, content.{entity,repository,mappers,service}.
- **Lọc công khai**: `prisma-listening.repository.ts:81,244`: bỏ `historicalPeriodId`; lọc theo `historicalPhaseId` và theo `periodId` qua `historicalPhase.periodId`. Query schema public + mobile đổi theo.
- Năm series ngoài khoảng phase: API chỉ lưu, không chặn; UI cảnh báo mềm theo điều kiện giao nhau ở trên.
- Verify: (1) test seed bất biến liền mạch; (2) test hàm kiểm "năm thuộc phase" cho biên: năm 43 thuộc phase II, không thuộc phase I; năm -179 thuộc thời kỳ 2; `endYear=null` chứa mọi năm sau start; (3) series 42–43 (mod ghi sai) vẫn xuất hiện khi lọc đúng phase; lọc theo period trả mọi phase con.

## Phase 2 — Nguồn series-level + PDF · ~9h
- `schema.prisma`: thêm `SeriesSource(id, seriesId FK Cascade, sourceId FK Restrict, locator default "", excerpt?, sortOrder, createdAt; unique(seriesId, sourceId, locator))`. **Drop `EpisodeSource`**.
- PDF: `MediaKind.DOCUMENT`; `cloudinary.gateway.ts` `resourceType(DOCUMENT)=raw`, allowlist `pdf`, size limit từ env có default; `media.formats.ts` mime pdf; `Source.fileAssetId` nullable → MediaAsset; Source hợp lệ nếu có `url` hoặc file. **Smoke đầu phase**: upload PDF raw thật, kiểm delivery URL.
- **Chống dọn nhầm PDF (review, đã đối chiếu code):** `cleanupDetachedMedia` (`maintenance-jobs.ts:21`) xóa mọi asset `narrationAudio: null` + `seriesCover: none` sau thời gian grace → PDF gắn qua `Source.fileAssetId` sẽ bị xóa. Đặt `Source.fileAssetId` unique, thêm điều kiện `sourceFile: null` vào query; khi gỡ/thay file của Source thì set `detachedAt` giống cover/audio để vẫn được dọn đúng. Test bắt buộc: asset đã gắn Source không bị dọn sau grace; asset bị gỡ khỏi Source thì bị dọn.
- Chuyển `listSources/addSource/patchSource/deleteSource/reorderSources` + routes từ `episode.routes.ts` sang `series.routes.ts`; repository, mapper, shared schema. Bỏ `sources` khỏi `EpisodeWorkspace`, thêm vào `SeriesDetail`.
- Publish: "≥1 nguồn" chuyển từ `episodeChecklist` sang `seriesChecklist`; xóa nguồn cuối của series đã publish → `REQUIRED_FOR_PUBLISHED`.
- Listening: citations trả theo series; sửa entity/repository/docs/mobile.
- Verify: test publish/xóa nguồn cuối; 1 Source gắn 2 series; upload PDF e2e.

## Phase 3 — Kịch bản text thuần + audio tập · ~2h
- `putNarration` lưu text thuần, giới hạn độ dài từ config, không HTML. UI chỉ dùng `THIRD_PERSON`.
- Audio chỉ upload (không còn `audioProvider`). Quy tắc publish tập: có script + audio.
- Verify: PUT script, attach audio, publish/hide.

## Phase 4 — Web studio UI · ~14h
Ưu tiên UI: `apps/web/docs/{design,skill}` + `apps/web/AGENTS.md` > code `apps/web/src` > `docs/design-guidelines.md`. Pattern: `features/moderator` + TanStack Query.
- Routes: `/studio/series`, `/studio/series/:id`, `/studio/episodes/:id`, `/studio/sources`; thay mục nav script-workflow cũ.
- Danh sách series: lọc trạng thái/tìm, tạo, ẩn/xóa/khôi phục.
- Chi tiết series: tiêu đề, mô tả, cover, Thời kỳ → Giai đoạn (cascading), năm + cảnh báo mềm, panel nguồn, danh sách tập sắp xếp, publish checklist.
- Chi tiết tập: tiêu đề/mô tả, `<textarea>` kịch bản, upload audio, publish/hide.
- Kho nguồn: CRUD, upload PDF, cảnh báo trùng (`/sources/similar`), lưu trữ/bỏ lưu trữ.
- Verify: chạy web+API, đi hết luồng series→tập→nguồn→publish trên trình duyệt thật, có ảnh chụp.

## Phase 5 — Docs + kiểm quét cuối · ~2h
- Cập nhật docs, `.env.example`, README, báo requirement lệch (nguồn theo Episode → Series).
- Quét cuối: grep trong `apps/` và `packages/` không còn `EpisodeSource`, `historicalPeriodId`, `scriptPublication`, `audioProvider`, `WorkflowRun`; prisma schema không còn model/enum/field mồ côi; `ai-engine` không bị import từ module nghiệp vụ; `archive/` không được import từ file nào ngoài chính nó; `bun run typecheck` + `bun test` + build web.

## Rủi ro
| Rủi ro | Giảm thiểu |
|---|---|
| Xóa lớn, dễ sót tham chiếu | Phase 0 làm trước, typecheck + grep làm cổng |
| Archive mục nát vì không được build | `README.md` ghi rõ "snapshot không chạy được" + tag `archive/script-workflow-v1` là bản chạy được; không nâng cấp dep trong archive |
| AI engine thành code chết nếu lâu không dùng | Có test riêng chạy trong CI; mốc tích hợp trợ lý là plan sau; nếu sau 2 quý chưa dùng thì xem xét đưa vào archive |
| `pi-*` thay đổi API theo version | Dep pin exact; test engine bắt vỡ |
| Engine bị gọi lén từ module nghiệp vụ (nối ngược vào logic chính) | Grep cổng ở Phase 0 và 5; module trợ lý sau này là module mới |
| Raw PDF Cloudinary bị chặn delivery | Smoke ngay đầu Phase 2 |
| Dữ liệu seed thời kỳ mâu thuẫn | Chặn seed Phase 1 đến khi team chốt |
| Drop table không backfill | Chỉ an toàn vì chưa có dữ liệu thật. Xác nhận trước khi chạy migration trên bất kỳ DB dùng chung |

## Câu hỏi mở
1. ~~Series publish bắt buộc ≥1 nguồn~~ **Chốt: có** (đã theo đề xuất).
2. ~~Quy ước mốc giao~~ **Chốt: nửa kín** `[start, end)` cho Thời kỳ/Giai đoạn; series đóng. Còn lại: team duyệt bảng seed đề xuất ở Phase 1 (mốc 1900 và -700).
3. ~~Dữ liệu cần giữ~~ **Chốt: không có**, drop thẳng.
4. ~~`EpisodeEntityTag`/`HistoricalEntity`~~ **Chốt: giữ nguyên schema**, kể cả `origin`, `status`, `confirmedBy` (pattern trợ lý gợi ý, mod xác nhận). Việc còn lại cho plan sau, không thuộc plan này: `HistoricalEntity` loại EVENT trùng khái niệm với Series và có `startYear/endYear` riêng (nguồn thời gian thứ ba), cần quyết định khi làm tìm kiếm theo nhân vật/sự kiện.
5. FIRST_PERSON narration + `narratorEntityId`: giữ schema, chưa làm UI (mặc định, chưa được xác nhận).
6. Chấp nhận archive workflow là snapshot không chạy được ngay? Mặc định: có. Engine thì chạy được vì nằm trong build.
7. ~~Tên module `ai-engine`~~ **Chốt: giữ tên `ai-engine`.**
