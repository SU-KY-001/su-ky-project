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

## Rule 5 — Đồng bộ component giao diện dashboard (Admin và Moderator)

Trước khi sửa hoặc thêm UI trong `apps/web`, phải tìm component có sẵn trong `src/shared/components/dashboard/` và `src/shared/components/ui/`, rồi đối chiếu màn hình đang hoạt động cùng loại. Ưu tiên tái sử dụng component chung; không tự dựng phiên bản riêng tại từng feature.

- **Xem chi tiết bản ghi:** giữ mẫu nút “Xem chi tiết” cũ của Moderator: nút chữ, bo góc, viền và nền nhạt theo token `mod-primary`, bấm mở popup trực tiếp. Dùng `DashboardRowActions` từ `@/shared/components/dashboard/DashboardRowActions` với một action `id: "detail"`; component tự render đúng nút cũ, không có icon mắt hoặc mũi tên. Không thay nút này bằng ba chấm hoặc dropdown “Thao tác → Xem chi tiết”. Không thêm một bước mở menu trước khi xem chi tiết.
- **Một hành động duy nhất:** `DashboardRowActions` phải render nút chữ trực tiếp theo nhãn hành động (ví dụ “Chỉnh sửa” tập podcast), không bọc trong dropdown “Thao tác”. Dùng cùng kiểu nút cũ của Moderator; không thêm icon hay bước mở menu trung gian.
- Menu chỉ dùng khi bản ghi có nhiều hành động nghiệp vụ thực sự cần gom (ví dụ sửa/khóa/xóa tài khoản); không ép mọi cột thao tác thành dropdown. Các trường hợp này tiếp tục dùng khả năng menu của component chung, không sao chép markup/style tại từng feature.
- **Card Kanban lịch phát hành:** không đặt nút hoặc menu “Thao tác” trên card. Bấm card (hoặc Enter/Space khi focus) mở chi tiết; kéo thả tiếp tục tuân theo trạng thái được backend cho phép.
- Feature chỉ truyền `label` của bản ghi, `actions` (`id`, `label`, `icon`, `onSelect`, `disabled`, `destructive`) và trạng thái `disabled` chung. Kích thước trigger, spacing, màu, focus, portal và kiểu menu do component chung quản lý; không thêm override riêng cho từng màn.
- Chỉ truyền những hành động người dùng có quyền thực hiện; giữ kiểm tra quyền và trạng thái tại backend. Hành động nguy hiểm dùng `destructive: true`; bước xác nhận vẫn do luồng nghiệp vụ xử lý. Không tự thêm hành động khi đổi giao diện.
- **Không lặp thao tác:** nếu popup chi tiết đã có gửi duyệt, phê duyệt, lưu hoặc xác nhận thì đặt thao tác đó trong popup; bảng chỉ giữ nút “Xem chi tiết” mở popup trực tiếp. Nút tạo mới, tìm kiếm, bộ lọc, phân trang, mở/đóng nhánh cây và nút trong form/popup dùng component tương ứng, không nhét vào menu của một bản ghi.
- **Bảng và trạng thái:** dùng `DashboardTableCard`, `DashboardDataTable`, `DashboardPagination`, `CardBadge` và các wrapper Moderator hiện có. Badge phải tự xuống dòng khi thiếu chỗ; không ép chiều cao/cắt chữ theo từng feature.
- **Bảng có hàng xổ/thu gọn:** khai báo `columnWidths` cho toàn bộ cột để component bảng chung dùng `table-layout: fixed`, như trang Dòng lịch sử. Mở thêm hàng con không được làm thay đổi tỷ lệ cột. Tên dài phải xuống dòng trong cột, icon không co lại; màn hình hẹp cuộn ngang trong container bảng hiện có, không đẩy rộng toàn trang.
- **Thông báo thao tác:** dùng `notify` từ `@/shared/lib/notifications` cho thành công, lỗi, cảnh báo và nhắc hạn. Không thêm banner toàn trang, `window.alert()` hoặc thông báo trạng thái chen vào nội dung bảng. Lỗi xác thực từng trường và thông tin nghiệp vụ trong chi tiết vẫn hiển thị tại đúng vị trí.
- **Xác nhận thao tác:** dùng shadcn/ui `AlertDialog` qua `ConfirmationDialog` và `useConfirmationDialog` dùng chung. Không dùng `window.confirm()`, `window.alert()` hoặc `window.prompt()`. Mô tả rõ tác động và bản ghi được chọn; chỉ gọi API sau khi xác nhận, nút “Quay lại”/Escape phải hủy mà không thay đổi dữ liệu.
- **Theo dõi phát hành:** lấy trạng thái lịch và tiến độ từ API, tự đồng bộ khi trang đang mở. Trạng thái worker phải dựa trên heartbeat `/health`, không suy ra từ số card hay tự giả lập “Đang phát hành”. Giữ bản chụp `baseUpdatedAt` và nội dung form chưa lưu khi cập nhật badge/tiến độ. Dùng các mốc tiến độ đã lưu để xem lại bước phát hành quá ngắn giữa hai lần đồng bộ.
- Khi thiếu khả năng dùng chung, mở rộng component hiện có hoặc bổ sung một component vào `src/shared/components/`, rồi áp dụng cho các màn cùng loại bị ảnh hưởng. Không sao chép markup/style giữa các feature. Chỉ thêm dependency khi stack hiện tại không đáp ứng được.
- Khi đổi menu thao tác, kiểm tra mở bằng bàn phím, chọn đúng bản ghi, đóng menu, trạng thái disabled và việc mở popup; không để click/menu làm kích hoạt thao tác của hàng/card cha.

Ví dụ:

```tsx
<DashboardRowActions
  label={record.title}
  actions={[
    { id: "detail", label: "Xem chi tiết", onSelect: () => openDetail(record) },
  ]}
/>
```

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
