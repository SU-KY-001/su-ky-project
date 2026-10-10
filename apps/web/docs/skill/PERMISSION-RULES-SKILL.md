---
name: safe-agent-guardrails
title: Safe Agent Guardrails
description: Mandatory safety rules for any coding agent working on a real project with terminal, file system, or git access. ALWAYS consult and follow this skill in every session, regardless of which agent is running — Claude Code, Codex CLI, Gemini CLI, or any other coding agent. Stop and apply this skill BEFORE executing any action that falls into one of these three categories — (1) any git command at all, including read-only ones like git status, git log, or git diff, (2) deleting, overwriting, renaming, or moving any file or directory, (3) any command with the potential to cause irreversible harm to the project, server, database, or production environment. Never assume an action is "obviously safe" as an excuse to skip asking — if it falls into one of these three categories, always ask first.
---

# Safe Agent Guardrails

A minimal set of safety rules for an agent operating on a real project. Goal: the agent must never make an irreversible change (git operations, file deletion, dangerous commands) without explicit, in-the-moment consent from the user.

This is a **prompt-level guardrail**, not a technical enforcement mechanism. It only works if the agent actually reads and follows it. See "Limitations of this skill" at the end for how to add real technical enforcement on top of it.

## General principle

Before running any command, ask yourself: *"Does this fall into one of the three forbidden categories below?"*

- If **yes** → stop, briefly explain what you intend to do and why, then **ask for permission** and wait for explicit confirmation from the user (e.g. "ok", "go ahead", "yes", "confirmed") before executing.
- If **unsure** → treat it as yes, and ask.
- Never treat a vague, general instruction ("just get it done", "fix it automatically for me") as permission to skip the ask-first step for the three categories below. Consent only counts when it clearly targets the specific action about to be taken.

---

## Rule 1 — Git commands: always ask first

The agent **must never run any git command on its own**, including read-only ones. This includes but is not limited to:

- Reading state: `git status`, `git log`, `git diff`, `git branch`, `git show`
- Changing state: `git add`, `git commit`, `git push`, `git pull`, `git fetch`, `git merge`, `git rebase`, `git reset`, `git checkout`, `git switch`, `git stash`
- Destructive/dangerous: `git push --force`, `git reset --hard`, `git branch -D`, `git clean -fd`, `git rm`, deleting or overwriting a remote

**Required process:**
1. State the exact git command you intend to run.
2. Briefly explain its purpose and effect (e.g. "this will commit 3 modified files to the current branch", "this will force-push and overwrite history on the remote").
3. Wait for explicit user confirmation for **that specific command**.
4. Only run it after confirmation is received.

Do not auto-commit "to keep things tidy", do not auto-push when a task is done, do not auto-create or delete branches, and do not auto-resolve merge conflicts via git without asking first.

---

## Rule 2 — Never delete, overwrite, or move files without permission

The following actions are forbidden unless explicitly permitted for each specific file/directory:

- Deleting files/directories: `rm`, `del`, `Remove-Item`, `os.remove`, `fs.unlink`, `shutil.rmtree`, an IDE's "delete file" action
- Overwriting content in a way that loses prior data with no backup (e.g. overwriting an entire config file, `.env`, or an already-run migration)
- Renaming or moving files/directories in a way that changes the project structure (`mv`, `Rename-Item`)
- Deleting or formatting an entire directory, disk, or volume

**Required process:**
1. List the exact path(s) of the file(s)/directory(ies) to be deleted, overwritten, or moved.
2. Explain why this is necessary.
3. Wait for explicit confirmation.
4. When deleting multiple files at once (e.g. cleaning a build directory), list them all before asking — never run a bulk/wildcard delete without first showing the user exactly what will be removed.

Creating new files or editing content (without deleting or destructively overwriting prior data) is not covered by this restriction, unless the task itself already requires asking before every change.

---

## Rule 3 — Never run commands that could harm the project

Do not run commands with the potential for irreversible harm or effects beyond the scope of the current worktree/project without asking first, for example:

- System/permissions: `sudo`, `chmod -R`, `chown -R`, formatting a disk, editing system files
- Uncontrolled network access: `curl ... | bash`, `wget ... | sh`, downloading and running scripts of unknown origin
- Database: `DROP DATABASE`, `DROP TABLE`, `TRUNCATE`, running a migration that deletes data, seeding that overwrites production data
- Deployment/production: deploying to production, restarting a production service, changing production environment variables, editing secrets/API keys
- Packages/publishing: `npm publish`, `pip upload`, pushing an image to a public registry
- Machine-wide installs: installing/removing system packages, changing global machine configuration

**Required process:**
1. Stop before running.
2. Explain the specific risk (e.g. "this will delete all data in the users table, and it cannot be recovered").
3. Suggest a safer alternative if one exists (e.g. back up first, run on staging first).
4. Only run after the user has explicitly confirmed they understand the risk and agree to proceed.

---

## Rule 4 — Never run a browser agent autonomously

The agent must not start, dispatch, or resume a browser agent or autonomous browser-use worker unless the user explicitly asks for browser-agent execution in the current task. A request to build, fix, review, or inspect a web interface does not by itself authorize running a browser agent.

---

## Permission request template

Use a short, clear, unambiguous format:

> I need to run the following command: `<exact command>`
> Purpose: <brief explanation>
> Effect: <what will change, and whether it's reversible>
> Do you confirm I should run this?

Do not proceed until you receive a clear, explicit "yes" for the exact command stated. Silence or an ambiguous reply does **not** count as consent.

---

## Limitations of this skill

This is prompt-level guidance — the agent must voluntarily comply. For an additional, real technical layer of enforcement (not just relying on the agent "remembering" to read this skill), combine it with the approval/sandbox settings of the CLI you're actually using, for example:

- **Codex CLI**: use `--ask-for-approval on-request` or `untrusted` + `--sandbox workspace-write`; do **not** use `--yolo` / `--dangerously-bypass-approvals-and-sandbox`.
- **Gemini CLI**: do **not** use `--yolo` / `--approval-mode=yolo`; leave it on the default `default` approval mode (prompt for approval).
- **Claude Code**: do **not** use `--dangerously-skip-permissions`.

If the agent is running in full-permission/yolo mode, the rules in this skill become nothing more than a note in the prompt rather than something the system actually enforces — so avoid combining full-permission mode with this skill if you actually want tight control.
