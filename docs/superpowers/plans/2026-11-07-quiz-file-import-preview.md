# Quiz File Import Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute inline; do not dispatch agents or run git commands without authorization under the project rules.

**Goal:** Import DOC/DOCX/text PDF/TXT/MD without AI, preview all recognized quiz content and actionable errors, and only apply a fully valid result after an explicit action.

**Architecture:** Structured document readers feed a deterministic shared parser on the backend. A new preview endpoint returns typed questions, source locations and diagnostics. The existing import popup becomes a file-only state machine and does not mutate the editor until confirmed; quiz persistence and activation retain their current contracts.

**Tech Stack:** Bun, Hono, Zod, @repo/shared, existing mammoth/fflate/unpdf, LibreOffice headless for DOC, React, existing shadcn/shared dashboard components.

**Spec:** docs/superpowers/specs/2026-11-07-quiz-file-import-preview-design.md

## Global Constraints

- No AI, OCR, automatic save/publication, database migration, automatic commits or machine-wide installs.
- Only one file per request; 5 MiB, 200,000 characters, 100 PDF pages, 100 final quiz questions. DOCX expansion: 20 MiB and 1,000 entries.
- End-to-end backend deadline 60 seconds; office converter deadline 30 seconds; FE deadline 75 seconds. Two active imports per API process, one per user.
- Remove paste UI, Dán văn bản / Tải tài liệu / Xem mẫu / Sao chép mẫu toolbar and Hủy nhập. Keep X/Escape and existing default button colors.
- Preview is read-only. Any blocking error disables application of the whole batch. Users fix their source and re-upload; no silent dropping or importing only good rows.
- Apply modifies only unsaved editor state. Replacement requires the existing ConfirmationDialog; append is the default when content exists.
- Keep /extract compatible, add /preview; update shared contracts and OpenAPI in the same implementation.
- Reuse existing components/tokens; notify for operation notifications, field/report diagnostics inside the popup. No raw HTML from documents is rendered.
- Respect apps/web/AGENTS.md, apps/api/AGENTS.md and docs route instructions. No autonomous browser execution without an explicit browser request.

## Review Focus

- End-of-file answer keys and restarted numbering across sections must not create phantom questions or link wrong answers (Task 2 fixtures).
- Word automatic numbering/table cells and PDF page breaks must survive extraction in the right order (Tasks 3 and 6 real-file tests).
- Converter crash, timeout, failed cancellation and late responses must not leave child processes/temp files or change the editor (Tasks 3–5 tests).
- Text that cannot be classified must appear in diagnostics and block apply when it might contain question content (Tasks 2 and 5 tests).
- Uploaded filename/extension/HTML and malformed archives are untrusted; no shell interpolation, raw HTML rendering or unchecked decompression (Tasks 3–5 tests).

---

### Task 1: Shared contracts and validation boundary

**Files:** Create packages/shared/src/schemas/quiz-import.ts and packages/shared/src/quiz-import/types.ts; modify packages/shared/src/index.ts; add apps/api/tests/quiz-import-contract.test.ts.

**Interfaces:** Export QuizImportPreviewSchema, QuizImportDiagnosticSchema, QuizImportSourceSchema and inferred types; internal QuizImportDocument contains format and ordered source blocks. Export limits and parserVersion. Preview questions allow kind null and incomplete fields; ready results must convert to existing QuizDraftQuestion without casts or invented data.

- [ ] Write failing schema tests: valid mixed kinds; incomplete question remains reportable; ready rejects errors/unknown kind/empty result; page/line nullable; counts equal question-derived counts; no response any.
- [ ] Run `bun test tests/quiz-import-contract.test.ts` in apps/api; confirm assertions fail before implementing the new schemas.
- [ ] Implement the schemas and `toReadyQuizQuestions(preview: QuizImportPreview): QuizDraftQuestion[]`; validateReadyQuiz remains the final structural readiness check. Do not duplicate existing response DTOs.
- [ ] Rerun contract tests and `bun run --cwd packages/shared check-types`; require passing exit codes.

### Task 2: Deterministic parser and complete diagnostics

**Files:** Create packages/shared/src/quiz-import/parser.ts, normalize.ts and diagnostics.ts; export via packages/shared/src/index.ts; create apps/api/tests/quiz-import-parser.test.ts and fixtures under apps/api/tests/fixtures/quiz-import/; modify apps/web/src/features/quiz/utils/quizTextImport.ts into compatibility wrappers for existing readiness callers.

**Interfaces:** `parseQuizDocument(document: QuizImportDocument, defaultTime: number): QuizImportPreview`; normalization preserves source block references. Diagnostics have stable code, severity, location, message and suggestion. Keep public readiness helpers used by QuizEditor working while replacing the duplicated parser logic.

- [ ] Write failing golden tests for one/all three kinds, multiline and inline options, declared/inferred kinds, Vietnamese aliases, accepted TEXT answers containing commas, default/explicit time, leading title and recognized headers.
- [ ] Add fixtures/assertions for answer keys at end, repeated numbering in different sections, missing/duplicate numbers, conflicting inline/key answers, duplicate questions/options, unknown kind, unsupported image reference, excess field lengths, unparsed prefix/suffix and partial extraction. Assert no source region is silently dropped.
- [ ] Run the parser test file and record expected failures.
- [ ] Implement state transitions preamble/questions/answer-key; link by section and source number, not array position. Ambiguous linking and uncertain kind/answer are blocking diagnostics; never invent answers. Missing number is diagnostic, not a fabricated question.
- [ ] Derive summary/status from results; attach actionable copy such as Câu 7, trang 2: đáp án D không tồn tại; sửa thành A/B/C hoặc bổ sung lựa chọn D.
- [ ] Rerun parser tests, existing quiz-authoring tests and web quizTextImport/quizState tests; adjust old expectations only where the approved input support changes.

### Task 3: Bounded readers, DOC conversion and runtime support

**Files:** Modify apps/api/src/modules/gamification/quiz-document.ts; create quiz-import/document-reader.ts, office-converter.ts, pdf-reader.ts, document-worker.ts and runner.ts under that module; modify apps/api/src/core/env.ts, apps/api/Dockerfile and .env.example; extend apps/api/tests/quiz-document.test.ts, add quiz-import-reader.test.ts and quiz-import-runner.test.ts; document setup in docs/quiz-text-import.md.

**Interfaces:** `readQuizDocument(file: File, signal: AbortSignal): Promise<QuizImportDocument>` executed through `runQuizImport(file: File, defaultTime: number, userId: string, signal: AbortSignal): Promise<QuizImportPreview>`. QUIZ_IMPORT_OFFICE_PATH selects the executable; fixed argv and generated temp paths only. Existing extractQuizDocument still returns the legacy text response.

- [ ] Add failing real-fixture tests for valid DOC, DOCX automatic numbering/tables, text PDFs crossing pages, TXT/MD BOM; verify ordered source blocks, not only string containment.
- [ ] Add rejection tests for zero bytes, wrong extension/signature, corrupt/archive bombs, encrypted PDF, scan-only PDF, unsupported PDF layout, non-UTF8 text, all input/output limits and converted DOC expansion limits.
- [ ] Add runner tests using controllable fake process/clock for converter missing, crash, 30-second conversion timeout, 60-second total timeout including document open, client abort, global/per-user overload, cleanup and late output. Check SERVICE_UNAVAILABLE is a controlled 503, not 500.
- [ ] Implement DOCX structured extraction with mammoth HTML and Bun HTMLRewriter; PDF lines from page text items; safe TXT/MD decoding; DOC conversion in an isolated process/profile/temp directory. Uncertain layout generates blocking diagnostics, not a best-guess ready result.
- [ ] Implement runner limits, terminate worker and owned process on abort/timeout; safely clean only owned temp paths in finally. Do not launch LibreOffice through a shell or use user-provided paths as commands. Logs exclude document body and answers.
- [ ] Add LibreOffice Writer runtime package to the Docker build definition; validate executable via env/config and controlled 503 when unavailable locally. Do not install it on the user's machine as part of source editing.
- [ ] Run reader/runner tests and API typecheck; build the updated image in an authorized environment and exercise an actual .doc fixture before declaring DOC supported.

### Task 4: Preview endpoint and OpenAPI

**Files:** Modify apps/api/src/modules/gamification/quiz-authoring.routes.ts and apps/api/src/routes/docs/paths/gamification.ts; add apps/api/tests/quiz-import-preview-route.test.ts; extend quiz-document-route.test.ts; modify apps/web/src/features/quiz/services/quizService.ts.

**Interfaces:** POST /api/studio/quiz-import/preview takes multipart `file`, `defaultTime` 10–120 (default 20). Returns QuizImportPreviewSchema. `quizService.previewDocument(file: File, defaultTime: number, signal: AbortSignal): Promise<QuizImportPreview>` uses credentials and 75-second timeout. Existing /extract contract remains unchanged.

- [ ] Write failing route tests: auth 401, listener/admin 403, missing/multiple files or malformed multipart 422, bad defaultTime 422, file too large 413, rate 429, worker unavailable/timeout 503, ready/needs_correction 200 with shared-schema validation and Cache-Control no-store.
- [ ] Add backward-compatibility test for /extract response and no DB/media writes from preview. Verify user identity passed into runner limits comes from session, never a form field.
- [ ] Implement guards, body bounds, signal propagation and runner call; document exact responses and multipart fields in OpenAPI. Keep error body standard and diagnostics inside successful analysis responses.
- [ ] Add the typed FE service method; do not auto-save or invoke activate from it.
- [ ] Run preview/document route tests, `bun test tests/openapi.test.ts` and API/shared typechecks.

### Task 5: File-only popup with report preview

**Files:** Rewrite apps/web/src/features/quiz/components/QuizTextImport.tsx; create QuizImportPreview.tsx and hooks/useQuizFileImport.ts; update components/QuizTextImport.test.tsx, screens/QuizEditor.test.tsx and quizLifecycle.test.tsx; reuse QuizEditor and existing shared components.

**Interfaces:** Hook state discriminant idle/processing/preview/failure with current request identity; preview consumes QuizImportPreview. Existing QuizTextImport `onApply(questions, replace, notes)` remains compatible, ready results supply empty unresolved notes. No pasted text field or source editing in popup.

- [ ] Replace old paste-first tests with failing file-first tests asserting no paste textarea, toolbar buttons, Hủy nhập, or auto-apply after upload. Assert Chọn tệp and accessible drop target exist.
- [ ] Add tests for same-file re-upload, unsupported/oversized/multiple file drop, ready result counts and three rendered kinds, per-question source/error/suggestion, unparsed region visibility, needs_correction disables apply, technical failure keeps editor unchanged.
- [ ] Add tests for X/Escape during processing, abort/late response, retry race, double click apply, focus restoration, scrollable preview, append total >100, replace confirmation/cancel, and no save/activate calls before or during apply.
- [ ] Implement state machine with AbortController and request identity. Start with only drop zone; replace content with preview after processing. Use default Button variants and shared CardBadge states; no extra color system or nested preview modal.
- [ ] Render preview as text React nodes; choices show correct selections/accepted TEXT answers; location labels only show real provenance. Show Chọn file khác/Tải lại file đã sửa and Đưa vào trình soạn. Keep X/Escape instead of Hủy nhập.
- [ ] Allow one apply only when ready and total <=100. Replace empty placeholder or append by default; confirm explicit replacement. Preserve title/reference/poster/settings and close only after applying result to unsaved editor state.
- [ ] Run component/editor/lifecycle tests and `bun run check-types` in apps/web. No tests that merely compare CSS class strings.

### Task 6: Real-file acceptance and documentation

**Files:** Extend apps/api/tests/fixtures/quiz-import/ with valid/malformed DOC/DOCX/PDF/TXT/MD and expected JSON; add apps/api/tests/quiz-import-end-to-end.test.ts and quiz-import-persistence.test.ts; update docs/quiz-text-import.md and test setup instructions.

**Interfaces:** Golden fixtures cover source -> real extraction -> parse -> preview schema -> final QuizDraftQuestion. Persistence verification uses the existing guarded test DB helper and save/activate/read APIs; never migrate or reset the working DB.

- [ ] Add complete mixed-type fixtures and each type alone in each supported format; expected data includes count/order/kind/text/options/answers/explanation/time. Byte fixtures must be real files, not mocked extraction returning prepared text.
- [ ] Include damaged DOC/DOCX/PDF, image-only/locked PDF, answer-key sections, long/wrapped questions, misleading numbered nonquestions, duplicate questions and answers, >100 questions, unknown regions, and a valid but factually wrong answer. The latter stays a documented semantic limitation, not a claim of factual validation.
- [ ] Run fixture suite with real LibreOffice in CI/test runtime; required acceptance tests must fail clearly when converter is missing, not silently skip DOC support while claiming all formats pass.
- [ ] On guarded DB test only, save/activate/read back a ready mixed quiz and assert exact question kinds/answers. Verify errors/aborts never write data; existing stale-write/ownership/publication rules still apply.
- [ ] Update operator and user docs: five extensions, supported content patterns, limits, error locations, fix-and-reupload flow, no AI/OCR/knowledge validation, and explicit save after applying.
- [ ] Run shared/API/web typechecks; parser/reader/route/OpenAPI/FE tests; protected integration suite with prepared test DB. Report unrelated baseline failures separately.
- [ ] If browser execution is explicitly requested, inspect idle/processing/ready/error popup at desktop and narrow widths, keyboard/drop/X/Escape, long errors and overflow. Otherwise report browser verification as not performed.

## Self-review and delivery

- [ ] Check each spec requirement against the owning task and its test; confirm all five Review Focus cases have real assertions.
- [ ] Confirm source boundaries and diagnostics survive extraction, ready conversion never invents data, no UI auto-applies file results, and no removed paste/cancel toolbar remains.
- [ ] Record actual supported fixtures and remaining layout limitations. Do not infer a universal accuracy percentage from passing tests.
- [ ] Deliver changed paths, test results, converter setup status and deployment requirements. No automatic git operations, deployment, or migration.

Implementation completed on 2026-11-07. See the sibling .progress.md ledger for exact validation, review fixes and conservative format limitations. Original step checklists are retained as the implementation brief; execution evidence is recorded in the ledger. Browser QA was not run because it requires an explicit browser request.
