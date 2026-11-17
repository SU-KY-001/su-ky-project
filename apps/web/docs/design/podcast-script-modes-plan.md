# Podcast script modes implementation plan

**Goal:** Implement the approved two-mode script workspace and reusable document import.
**Architecture:** Keep one editor and mounted AI controllers, expose distinct full-width workspaces. Extract reusable document upload UI from Quiz; use its backend reader in a bounded, moderator-only script extraction endpoint without quiz parsing.
**Execution:** Inline in current authorized workspace; no git operations or deployment.

- [x] Test and implement shared file picker, script extraction contract/endpoint, import preview with append/replace and cancellation.
- [x] Test and implement manual-default mode switch; retain editor, draft, review and rewrite state, sources, attachments, saving and dialogue.
- [x] Run affected Web/API tests, OpenAPI and TypeScript; fix regressions and record limitations.

## Execution notes

- Reused the bounded Quiz document reader/worker in text-extraction mode, with a separate moderator-only `/api/studio/script-import/extract` endpoint and shared response schema. No quiz question parsing, database write or persistent attachment on import.
- Kept the editor mounted and AI controllers mounted after first visit. Mode changes hide their UI, preserving editor undo, AI topic/outline and requests. Existing dialogue editing remains its own format; it now also supports file import through the existing `importTurns` adapter without removing speakers.
- Fresh review found missing CSS scope, mobile review widths and automatic mode changes from editor clicks/hidden-editor focus. Fixed with explicit scope, responsive review layout, interaction gating and an explicit action to open the passage in the manual editor.
- Verification: full Web suite 337 passed; targeted API/worker/reader/OpenAPI suite 33 passed; Web build and API typecheck passed. Replacement/append/undo/oversize/cancel and mode state retention are tested.
- Browser verification remains with the user as agreed earlier. No live paid AI generation was started. DOC import requires the existing server LibreOffice converter; PDF must contain selectable text (no OCR).
