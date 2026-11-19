# Unified typed podcast script plan

Approved: deterministic structural recognition (speaker labels), no AI classification.

- [x] Add shared structural classifier with tests for monologue, dialogue, mismatch, ambiguity and preserved text.
- [x] Add typed import preview and explicit mismatch resolution; keep cancellation and replacement confirmation.
- [x] Replace the separate dialogue page with rich dialogue blocks in the existing script workspace; preserve roles, expressions, tone, notes, edits and old saved data.
- [x] Move speaker voice configuration to Giọng đọc, save before TTS and preserve current audio/hash rules.
- [x] Verify types, API/OpenAPI and affected/full Web suites. No live AI calls or database changes are required.

## Execution notes

- Type selection is required before writing/importing a new empty script. Import mismatches block apply and require explicit type adoption or another file; ambiguous labels allow correction in preview.
- Structural recognition does not call AI. It recognizes clear named roles, warns on unresolved label-like lines and unassigned introductions, and never silently accepts those as another role's words.
- Replaced the old DialogueScriptStep with a typed rich editor adapter in the common script workspace. Persisted optional per-turn rich documents must exactly match turn text; existing payloads without those documents still work. No schema migration is needed.
- Voice selectors moved to Giọng đọc's AI panel, including duplicate-voice validation. Script/configuration saving is awaited before starting TTS. Existing dialogue speech hashes and two-/multi-speaker generation remain unchanged.
- Fresh review identified autosave dependencies, unsupported pasted formatting, unknown labels, duplicate editor node IDs and sparse speaker-key reuse. These were addressed and tested.
- Verified: Web build and API typecheck passed; full Web suite 340 passed before adding three additional passing role/voice/contract tests; targeted API narration, voice, speech, script-import and OpenAPI suite 38 passed; shared structural recognition suite 4 passed.
- Browser verification remains with the user per earlier agreement. No live paid AI calls or database writes were performed. Existing AI draft generation remains monologue-only; dialogue structure imports and edits do not silently call the monologue generator.
