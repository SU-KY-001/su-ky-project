# Quiz editor redesign implementation plan

> **For agentic workers:** Execute inline using superpowers:executing-plans. Preserve the user's current coding workspace; no Git mutations or automatic commits.

**Goal:** Match the three approved quiz mockups while retaining the dashboard's shared UI and existing quiz behavior.

**Architecture:** Keep QuizEditor state, revision handling and mutations intact. Replace its presentation with a question outline, central form and script reference panel. Read reference text through the existing studio episode endpoint in quizService, with TanStack Query managing loading and refresh.

**Tech Stack:** React 19, Tailwind v4, existing quiz CSS, shadcn/Radix shared controls, Hono RPC, TanStack Query.

**Spec:** User-approved workspace images `quiz-mockup-01-bat-dau-soan.png`, `quiz-mockup-02-bien-tap.png`, `quiz-mockup-03-xem-thu.png`, plus the explicit requirement to reuse dashboard components.

## Global constraints

- Reuse Button, Input, Textarea, Label, ModeratorSelect, CardBadge, Accordion, Skeleton, Dialog and ConfirmationDialog; use notify for action feedback.
- Retain the real WorkspaceShell and brand logo instead of recreating generated navigation.
- Use existing moderator tokens and Manrope; no new dependencies, hardcoded palette, or generated fake content.
- Preserve save, activation, generation confirmations/cancellation, concurrency checks, navigation blocking, keyboard access, all field limits and 100-question limit.
- Time remains authoring guidance, not a test timer. No misleading mockup character counters.

## Review focus

- Incomplete or missing scripts: honest empty/loading/error states; editing remains available.
- Switching between manual/generated questions: correct evidence and no stale selection state.
- Long text and narrow viewports: wrapping and contained scrolling without clipped actions.
- Reordered/duplicated questions: answer selection and explanation stay bound to question IDs.
- Preview: no submitted attempt or data mutation; selected answer locks and resets on reopening.

## Task 1: Authoring workbench

**Files:** QuizEditor.tsx, quiz.css, quizService.ts, useQuiz.ts, new QuizScriptReference.tsx under `apps/web/src/features/quiz/`.

**Interfaces:** Preserve QuizEditor props and all existing quiz mutation signatures. Add quizService.script(episodeId) returning Promise<string> and useQuizScript(episodeId, scriptHash, enabled), using EpisodeWorkspaceSchema.

- [x] Add interaction checks for manual script reference, answer/explanation editing and evidence/full script switching; run against existing UI to observe missing behavior.
- [x] Implement compact toolbar/title strip, text question outline, neutral A–D rows, central explanation and secondary question actions.
- [x] Add script reference with real source text, per-question evidence, empty/loading/retry states and existing generation/time controls.
- [x] Use responsive container-based columns: stacked on mobile, outline plus form on medium screens, three columns when space permits.
- [x] Run quiz tests and typecheck (production code passes; full typecheck blocked by missing test helper modules).

## Task 2: Preview and visual verification

**Files:** QuizPreview.tsx, quiz.css, relevant quiz interaction tests.

**Interfaces:** Preserve QuizPreview props and its local-only answer state.

- [x] Verify answer feedback and navigating/reopening preview with an interaction test.
- [x] Apply mockup dialog layout, vertical neutral answers, accessible progress, correct-answer feedback and footer navigation using shared UI.
- [x] Run web test suite, typecheck and production build; report pre-existing failures separately.
- [x] Start Vite and inspect rendered editor/preview at desktop and narrow widths; capture comparison screenshots without introducing product demo routes.
- [x] Review final files for shared UI reuse and preserved mutations.

## Execution notes

- Initial verification found `apps/web/bunfig.toml` references missing `src/test/setup.ts`. Use a task-local Bun configuration and DOM preload for validation; do not change shared test infrastructure.
- The quiz workspace response contains script metadata, not the full script. The existing studio episode GET response includes THIRD_PERSON.scriptContent, the same source used for quiz generation.
- Task 1 and Task 2 complete: 9 quiz tests / 34 assertions pass with the task-local DOM preload; tests first failed on the missing reference panel and preview feedback, then passed after implementation.
- Production TypeScript passes using an otherwise identical configuration excluding test files. Standard `bun run check-types` and `bun run build` are blocked solely by missing test helpers. Standalone `bun x vite build` passes, with existing large-chunk warnings.
- Full web suite using the task-local DOM preload: 189 pass, 10 fail / 10 module errors across 199 tests, all remaining failures importing absent `@/test/dashboardActions`, `@/test/releaseReviewFixtures`, or `@/test/historicalCatalogServer`.
- Read-only independent review found no important correctness/shared-component regressions. Its minor long-title overflow finding was corrected with word wrapping; browser verification confirms a 200-character unbroken title does not create horizontal overflow at 390px.
- Browser checks: desktop 1600px and mobile 390px, no horizontal overflow in editor or preview, answer feedback rendered correctly. Real shared WorkspaceShell and editor components rendered through a task-local harness because the actual route requires login. Temporary harness is outside product routes and production source. Orca browser became unavailable during QA; headless local Edge completed screenshot verification.
- Final screenshots are in `output/quiz-redesign/`. No Git commands, commits, backend changes, dependency additions or shared component modifications.
