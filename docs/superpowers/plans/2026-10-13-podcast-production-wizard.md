# Podcast Production Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay trang tạo tập podcast hiện tại bằng wizard bốn bước có Tiptap, tài liệu tham khảo, upload và nghe thử audio, màn xem lại, lưu nháp và xuất bản trực tiếp; AI chỉ dùng mock frontend.

**Architecture:** `PodcastCreation` giữ vai trò container và điều phối một store cục bộ dùng chung cho bốn step component. Backend mở rộng narration để lưu Tiptap JSON, plain text suy ra và kết quả phân tích audio; tài liệu tham khảo được gắn vào episode qua model riêng. Luồng AI thật không được triển khai trong kế hoạch này.

**Tech Stack:** React 19, TypeScript, TanStack Query, Tiptap, Tailwind CSS v4, Hono RPC, Zod, Prisma/PostgreSQL, Cloudinary media storage, Bun test.

**Spec:** `docs/superpowers/specs/2026-10-13-podcast-production-wizard-design.md`

## Global Constraints

- Tuân thủ `apps/web/AGENTS.md` và toàn bộ tài liệu trong `apps/web/docs`.
- Dùng moderator design token và Manrope; không hardcode màu hoặc font mới.
- Bốn bước luôn truy cập được; trạng thái hoàn thành không khóa điều hướng.
- Không thêm trạng thái duyệt cho episode.
- Không gọi AI provider hoặc ElevenLabs; mọi UI AI dùng fixture mock và nhãn **Bản xem trước**.
- Backend tự sinh `scriptContent` từ Tiptap JSON; không tin plain text do client gửi kèm.
- Toast chỉ hiển thị trạng thái ngắn; lỗi chi tiết hiển thị tại vùng thao tác.
- Git command không nằm trong kế hoạch vì quy định dự án yêu cầu quyền riêng cho thao tác Git.
- Browser automation chỉ chạy sau khi có quyền riêng theo `apps/web/docs/skill/PERMISSION-RULES-SKILL.md`.

## Review Focus

- Tiptap document chứa node/mark không được hỗ trợ phải bị từ chối mà không làm mất bản đang lưu — Task 1 và Task 3 có test schema/service.
- Đổi kịch bản sau khi đã gắn audio phải tiếp tục sinh cảnh báo `SCRIPT_CHANGED_AFTER_AUDIO` — Task 3 mở rộng regression test hiện có.
- File attachment đã gắn không được maintenance job xóa; file bị gỡ phải trở lại cleanup lifecycle — Task 2 có integration test.
- Chuyển step khi chưa có episode ID không được mất dữ liệu cục bộ hoặc gọi API sai — Task 4 có reducer/state tests.
- Object URL audio phải được thu hồi khi thay file hoặc unmount, và audio đã upload phải dùng signed preview URL — Task 7 có lifecycle helper test và component verification.

---

### Task 1: Tiptap document contract và database foundation

**Files:**
- Create: `packages/shared/src/schemas/content/editor-document.ts`
- Modify: `packages/shared/src/schemas/content/episode.ts`
- Modify: `packages/shared/src/schemas/content/studio.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/<timestamp>_podcast_wizard_content/migration.sql`
- Create: `apps/api/src/modules/content/application/script-document.ts`
- Create: `apps/api/tests/podcast-script-document.test.ts`

**Interfaces:**
- Produces: `EditorDocumentSchema`, `EditorDocument`, `AudioAnalysisSchema`, `EpisodeAttachmentSchema`.
- Produces: `extractScriptText(document: EditorDocument): string`.
- Database adds nullable `EpisodeNarration.scriptDocument Json`, nullable `EpisodeNarration.audioAnalysis Json`, and `EpisodeAttachment` with `episodeId`, unique `mediaAssetId`, `fileName`, timestamps and relations.

- [ ] **Step 1: Write failing document tests**

Add tests proving `extractScriptText` preserves paragraph/list boundaries, excludes citation metadata from spoken text, accepts the editor's allowed nodes/marks, and rejects unsupported nodes such as raw HTML.

- [ ] **Step 2: Verify the tests fail for the missing contract**

Run: `bun test apps/api/tests/podcast-script-document.test.ts`

Expected: FAIL because `script-document.ts` and the shared schemas do not exist.

- [ ] **Step 3: Define the shared schemas and text extractor**

Allow document, paragraph, text, heading, bullet list, ordered list, list item and blockquote nodes; allow bold, italic, underline and source citation marks. Validate IDs and cap serialized document size consistently with `script.max_chars` after text extraction.

- [ ] **Step 4: Add Prisma fields, attachment model and migration**

The migration must preserve existing narration rows and make every new field nullable. Add the reverse attachment relation to `Episode` and `MediaAsset`.

- [ ] **Step 5: Generate Prisma client and verify contracts**

Run from `packages/db`: `bun run db:generate`

Run: `bun test apps/api/tests/podcast-script-document.test.ts`

Run from `packages/shared`: `bun run check-types`

Run from `packages/db`: `bun run check-types`

Expected: test and both type checks PASS.

### Task 2: Episode attachment and document media backend

**Files:**
- Modify: `packages/shared/src/schemas/content/episode.ts`
- Modify: `packages/shared/src/schemas/content/studio.ts`
- Modify: `packages/db/src/seed.ts`
- Modify: `apps/api/src/core/config/system-config.ts`
- Modify: `apps/api/src/core/jobs/maintenance-jobs.ts`
- Modify: `apps/api/src/modules/content/domain/content.entity.ts`
- Modify: `apps/api/src/modules/content/domain/content.repository.ts`
- Modify: `apps/api/src/modules/content/infrastructure/prisma-content.repository.ts`
- Modify: `apps/api/src/modules/content/application/content.service.ts`
- Modify: `apps/api/src/modules/content/application/content.mappers.ts`
- Modify: `apps/api/src/modules/content/presentation/episode.routes.ts`
- Create: `apps/api/tests/episode-attachments.test.ts`

**Interfaces:**
- Produces: `GET /api/studio/episodes/:id/attachments`.
- Produces: `POST /api/studio/episodes/:id/attachments` with `{ assetId, fileName }` and idempotency.
- Produces: `DELETE /api/studio/episodes/:id/attachments/:childId`.
- Consumes: `EpisodeAttachmentSchema` and Prisma model from Task 1.

- [ ] **Step 1: Write failing attachment service tests**

Test that a moderator can attach a READY DOCUMENT they uploaded, cannot attach AUDIO or another moderator's media, cannot attach the same asset twice, can list the original file name, and can detach it.

- [ ] **Step 2: Write the failing cleanup regression test**

Prove `cleanupDetachedMedia` skips an asset referenced by `EpisodeAttachment`, then becomes eligible after the attachment is removed and `detachedAt` is stamped.

- [ ] **Step 3: Verify attachment tests fail**

Run: `bun test apps/api/tests/episode-attachments.test.ts`

Expected: FAIL because repository/service/routes are absent.

- [ ] **Step 4: Implement attachment repository and service operations**

Follow the existing episode ownership and `assertWritable` checks. Attach and detach media inside transactions; deleting the attachment sets the asset's `detachedAt` instead of deleting media immediately.

- [ ] **Step 5: Add routes, DTO mapping and workspace attachments**

Expose attachments both through the dedicated list endpoint and `EpisodeWorkspaceSchema` so the review step can load everything in one request.

- [ ] **Step 6: Expand DOCUMENT allowlists**

Add PDF, DOC and DOCX extensions/MIME types to system-config defaults and seed values. Keep backend verification authoritative.

- [ ] **Step 7: Protect attachments from cleanup and verify**

Add the reverse relation condition to `cleanupDetachedMedia`.

Run: `bun test apps/api/tests/episode-attachments.test.ts`

Run from `apps/api`: `bun run check-types`

Expected: PASS.

### Task 3: Persist rich script and audio analysis through narration APIs

**Files:**
- Modify: `packages/shared/src/schemas/content/episode.ts`
- Modify: `packages/shared/src/schemas/content/studio.ts`
- Modify: `apps/api/src/modules/content/domain/content.entity.ts`
- Modify: `apps/api/src/modules/content/domain/content.repository.ts`
- Modify: `apps/api/src/modules/content/infrastructure/prisma-content.repository.ts`
- Modify: `apps/api/src/modules/content/application/content.service.ts`
- Modify: `apps/api/src/modules/content/application/content.mappers.ts`
- Modify: `apps/api/tests/series-sources.test.ts`

**Interfaces:**
- `PutNarrationSchema` accepts `scriptDocument`; backend derives `scriptContent`.
- `AttachAudioSchema` accepts optional `analysis: AudioAnalysis`.
- `NarrationSchema` returns `scriptDocument`, `scriptContent`, `audioAnalysis`, word count, estimated duration and warnings.

- [ ] **Step 1: Extend failing narration tests**

Add tests that saving an editor document persists JSON, derives exact plain text, enforces `script.max_chars`, rejects unsupported content, and keeps `SCRIPT_CHANGED_AFTER_AUDIO` behavior.

- [ ] **Step 2: Add failing audio-analysis tests**

Test round-trip persistence of duration ratio/noise analysis and confirm analysis cannot be attached without a valid READY audio asset.

- [ ] **Step 3: Verify the tests fail**

Run the targeted `plain-text script` and new audio-analysis tests in `apps/api/tests/series-sources.test.ts`.

Expected: FAIL because the new inputs and persisted fields are absent.

- [ ] **Step 4: Implement repository and service changes**

Parse the document with the shared schema, derive text server-side, run the existing script length validation against derived text, and update `scriptUpdatedAt`. Persist audio analysis in the same attach-audio transaction.

- [ ] **Step 5: Return new fields from mappers**

Keep current word-count, duration and publication checklist behavior based on derived plain text and READY audio.

- [ ] **Step 6: Verify narration behavior**

Run: `bun test apps/api/tests/series-sources.test.ts`

Run from `apps/api`: `bun run check-types`

Expected: PASS, with integration-only tests skipped unless the test database flag is enabled.

### Task 4: Frontend API client and wizard state

**Files:**
- Modify: `apps/web/package.json`
- Modify: `bun.lock`
- Modify: `apps/web/src/features/podcast-production/services/podcastProductionService.ts`
- Modify: `apps/web/src/features/podcast-production/hooks/usePodcastProduction.ts`
- Create: `apps/web/src/features/podcast-production/podcastWizardState.ts`
- Create: `apps/web/src/features/podcast-production/podcastWizardState.test.ts`
- Create: `apps/web/src/features/podcast-production/hooks/usePodcastCreationWizard.ts`

**Interfaces:**
- Produces: `PodcastWizardStep = "information" | "script" | "voice" | "review"`.
- Produces: state selectors `informationComplete`, `scriptComplete`, `voiceComplete`.
- Produces: `ensureDraft(): Promise<string>`; it creates exactly one episode once series and title exist.
- Produces: service methods for attachments, document narration, audio analysis, draft update and publish.

- [ ] **Step 1: Install minimal Tiptap packages**

From `apps/web`, add `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline` and `@tiptap/extension-placeholder`. Do not add an AI or document-parsing dependency.

- [ ] **Step 2: Write failing wizard-state tests**

Test unrestricted step selection, completion changes in both directions, pending local state before an episode exists, and single-flight `ensureDraft` behavior under two concurrent save calls.

- [ ] **Step 3: Verify state tests fail**

Run from `apps/web`: `bun test src/features/podcast-production/podcastWizardState.test.ts`

Expected: FAIL because the state module does not exist.

- [ ] **Step 4: Implement API client methods and query invalidation**

Parse every response with shared Zod DTOs. Preserve idempotency for episode creation and attachment creation.

- [ ] **Step 5: Implement state helpers and creation hook**

Keep unsaved values when navigation changes. `ensureDraft` returns a useful inline error when series/title are missing and must not clear local values.

- [ ] **Step 6: Verify wizard state**

Run: `bun test src/features/podcast-production/podcastWizardState.test.ts`

Expected: PASS.

### Task 5: Wizard shell, stepper and compact information step

**Files:**
- Rewrite: `apps/web/src/features/podcast-production/PodcastCreation.tsx`
- Create: `apps/web/src/features/podcast-production/components/PodcastWizardStepper.tsx`
- Create: `apps/web/src/features/podcast-production/components/PodcastInformationStep.tsx`
- Modify: `apps/web/src/styles/globals.css`

**Interfaces:**
- Consumes: `usePodcastCreationWizard` from Task 4.
- Produces: a single responsive workspace with persistent top stepper and bottom navigation/actions.

- [ ] **Step 1: Add a failing stepper behavior test or pure view-model test**

Assert all four step actions remain enabled regardless of completion and completed steps expose accessible status text.

- [ ] **Step 2: Implement the shell and stepper**

Match the supplied mockup's hierarchy while using moderator tokens. Add a short success animation only when a step transitions from incomplete to complete and respect `prefers-reduced-motion`.

- [ ] **Step 3: Implement the information step**

Use the existing series query and inherited historical event. Allow title and description edits after the episode draft exists through `patchEpisode`; series remains fixed after creation because episodes cannot move between series in the current model.

- [ ] **Step 4: Verify step navigation and TypeScript**

Run the targeted frontend test from Step 1 and `bun run check-types` from `apps/web`.

Expected: targeted test PASS; record any unrelated pre-existing type failures separately.

### Task 6: Tiptap script workspace, attachments, sources and AI mock

**Files:**
- Create: `apps/web/src/features/podcast-production/components/PodcastScriptStep.tsx`
- Create: `apps/web/src/features/podcast-production/components/RichScriptEditor.tsx`
- Create: `apps/web/src/features/podcast-production/components/ScriptAssistantMock.tsx`
- Create: `apps/web/src/features/podcast-production/components/ScriptSourcesPanel.tsx`
- Create: `apps/web/src/features/podcast-production/scriptEditor.ts`
- Create: `apps/web/src/features/podcast-production/scriptEditor.test.ts`
- Modify: `apps/web/src/styles/globals.css`

**Interfaces:**
- Consumes: series sources, episode attachments and narration document.
- Produces: Tiptap JSON compatible with `EditorDocumentSchema` and citation marks containing valid series-source IDs.

- [ ] **Step 1: Write failing editor utility tests**

Test empty-document detection, character count from derived text, citation insertion payload, and conversion of a legacy plain-text narration to paragraphs on first load.

- [ ] **Step 2: Implement the editor utility and Tiptap extension configuration**

Use only the schema nodes/marks accepted by the backend. The editor grows with content and has no fixed internal scroll height.

- [ ] **Step 3: Implement toolbar and debounced save**

Add headings, bold, italic, underline, ordered/unordered lists, blockquote, undo/redo and source insertion. Save JSON through the narration API without sending authoritative plain text.

- [ ] **Step 4: Implement reference document upload**

Show per-file progress/error, retain local pending uploads until `ensureDraft` succeeds, then attach them. Support list, download/open and remove actions.

- [ ] **Step 5: Implement source and AI panels**

Sources come from the selected series. AI findings are stable fixture data and local dismiss/apply-preview states; no network call is allowed.

- [ ] **Step 6: Verify script behavior**

Run: `bun test src/features/podcast-production/scriptEditor.test.ts`

Run from `apps/web`: `bun run check-types`

Expected: targeted test PASS.

### Task 7: Audio upload, analysis, preview and AI voice mock

**Files:**
- Create: `apps/web/src/features/podcast-production/components/PodcastVoiceStep.tsx`
- Create: `apps/web/src/features/podcast-production/components/UploadedAudioPanel.tsx`
- Create: `apps/web/src/features/podcast-production/components/AiVoiceMockPanel.tsx`
- Create: `apps/web/src/features/podcast-production/audioAnalysis.ts`
- Create: `apps/web/src/features/podcast-production/audioAnalysis.test.ts`

**Interfaces:**
- Produces: `analyzeAudioFile(file: File, estimatedDurationMs: number): Promise<AudioAnalysis>`.
- Consumes: existing media upload plus narration attach endpoint extended in Task 3.

- [ ] **Step 1: Write failing pure analysis tests**

Test duration ratio thresholds, noise status classification, allowed MIME/extension handling and formatting of duration/check results. Keep Web Audio decoding behind an injectable adapter so calculations are testable without a browser audio device.

- [ ] **Step 2: Implement analysis and object-URL lifecycle helper**

Calculate a documented RMS/noise proxy and label it as a preliminary check. Revoke the previous object URL when replacing a file and on unmount.

- [ ] **Step 3: Implement the real upload mode**

Preview locally immediately, show format/duration/noise results, upload through `uploadCatalogMedia`, attach to narration with analysis, then switch playback to the signed backend URL. Support replacement and clear per-operation errors.

- [ ] **Step 4: Implement AI voice mock**

Use fixtures for voices, preview controls, speed, stability, character estimate and per-segment statuses. Mock actions must not mark the voice step complete or call the API.

- [ ] **Step 5: Verify voice behavior**

Run: `bun test src/features/podcast-production/audioAnalysis.test.ts`

Run from `apps/web`: `bun run check-types`

Expected: targeted test PASS.

### Task 8: Review, draft save and direct publishing

**Files:**
- Create: `apps/web/src/features/podcast-production/components/PodcastReviewStep.tsx`
- Create: `apps/web/src/features/podcast-production/podcastChecklist.ts`
- Create: `apps/web/src/features/podcast-production/podcastChecklist.test.ts`
- Modify: `apps/web/src/features/podcast-production/PodcastCreation.tsx`
- Modify: `apps/web/src/features/podcast-production/PodcastWorkspace.tsx`

**Interfaces:**
- Consumes: complete wizard state, episode workspace DTO and backend publish checklist.
- Produces: final Save Draft and Publish actions with no review state.

- [ ] **Step 1: Write failing checklist presentation tests**

Map backend checklist and warnings to Vietnamese labels, including missing script, missing audio, series not published, script changed after audio and duration mismatch.

- [ ] **Step 2: Implement review summaries**

Render compact information, read-only rich-script preview, sources, attachments, audio analysis and a full audio player. Missing sections link directly to the corresponding wizard step.

- [ ] **Step 3: Implement save draft**

Flush pending information, editor, attachments and audio mutations; report one short success toast only after all savable changes settle.

- [ ] **Step 4: Implement direct publish**

Refresh the episode workspace before publishing, show unmet backend conditions inline, and call `publishEpisode` with current `updatedAt` when ready. On success, return to the workspace and expand the parent series.

- [ ] **Step 5: Verify review and publish behavior**

Run: `bun test src/features/podcast-production/podcastChecklist.test.ts`

Run from `apps/web`: `bun run check-types`

Expected: targeted test PASS.

### Task 9: Migration, regression checks and visual QA gate

**Files:**
- Modify as required by failures limited to this feature.

**Interfaces:**
- Consumes all previous tasks.
- Produces a migration-ready, type-safe feature with documented verification evidence.

- [ ] **Step 1: Apply the migration to the configured development database**

Run from `packages/db`: `bun run db:deploy`

Expected: the podcast wizard migration applies without changing existing episode status or deleting content.

- [ ] **Step 2: Run targeted backend tests**

Run the new script-document and attachment tests plus existing podcast core/source tests. Enable integration tests only against the test database guarded by `assertTestDatabase()`.

- [ ] **Step 3: Run targeted frontend tests**

Run the wizard state, editor, audio analysis and checklist tests.

- [ ] **Step 4: Run package checks**

Run `check-types` for shared, db, api and web, then run the web build. Report pre-existing missing-test-helper errors separately and do not hide them.

- [ ] **Step 5: Request browser-agent permission for visual QA**

After implementation is complete and reviewable, request the explicit permission required by `apps/web/docs/skill/PERMISSION-RULES-SKILL.md`. With approval, verify all four steps at desktop and narrow widths, keyboard navigation, reduced-motion behavior, upload states and audio playback.

- [ ] **Step 6: Confirm no AI network integration exists**

Search production frontend and API code for ElevenLabs endpoints/keys and verify the new AI panels import fixtures only.

