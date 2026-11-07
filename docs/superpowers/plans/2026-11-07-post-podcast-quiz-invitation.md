# Post-podcast quiz invitation

Approved: compact optional invitation headed “Ôn lại nội dung vừa nghe”, actual episode title and question count; “Bắt đầu quiz” links straight to /quiz/:slug and pauses current audio, “Để sau” dismisses without interrupting playback. Avoid repeating skipped episodes in the listening session. Keep existing paper/vermilion tokens, reduce shadow and measure toolbar height so the card does not cover controls.

- [x] RED: real audio DOM/store tests for ended episode/count, direct navigation + pause, delayed metadata, dismissal/replay, no quiz and stale results after close.
- [x] Implement explicit pause intent in playback store and AudioPlayback (including autoplay suppression on late metadata).
- [x] Extract a presentational invitation card and connect it to PodcastToolbar; guard async results against session/end changes, remember handled episode slugs per listening session, position above measured toolbar.
- [x] GREEN: focused tests, web typecheck and whole web suite; no browser execution, git operations, mobile changes or backend changes.

The older BookReader/PodcastPlayer view is not mounted by the current routes; this change targets the global toolbar used by the public series pages.

## Execution evidence

- Approved UI implemented with existing components/tokens and no new dependencies. Scope is web only; no API/mobile/database/git operations.
- Audio end triggers an optional quiz invitation using the ended episode and actual public quiz question count; direct start pauses the current playlist and navigates to /quiz/:slug. Dismissed/started invitations are suppressed per episode for the current visible listening session.
- Toolbar ResizeObserver supplies the card bottom offset; the card title clamps to two lines with a full title attribute and its content can scroll on short viewports.
- Nine real DOM/store tests cover actual end events, next-track autoplay/late metadata, direct navigation, dismiss without pause, repeat suppression, no quiz questions, stale lookup after close, measured toolbar positioning, late play events, and delayed progress saves during close/pause.
- Independent final review found two Important playback races (late play cancels pause intent; repeat-one restarts after awaited save). Both reproduced with failing tests and corrected before final checks. No deferred findings.
- Whole web suite: 307 passed, 0 failed. New Vite component/toolbar/player modules compile over the existing dev server. Browser visual verification was not performed because project rules require an explicit browser request.
