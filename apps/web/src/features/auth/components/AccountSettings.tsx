import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UpdateProfileSchema, type UpdateProfileInput, type UserProfileDto } from "@repo/shared";
import { Avatar } from "radix-ui";
import { Camera, Check, Mail, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { notify } from "@/shared/lib/notifications";
import { APP_PATHS } from "@/shared/constants/routes";
import { ApiError } from "@/lib/apiError";
import { useProfileActions } from "../hooks/useProfileActions";



function profileError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.status === 429) return "Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.";
    if (error.errorCode === "MEDIA_TOO_LARGE") return "Ảnh không được vượt quá 5 MB.";
    if (error.errorCode === "MEDIA_TYPE_NOT_ALLOWED") return "Vui lòng chọn ảnh JPEG, PNG hoặc WebP hợp lệ.";
    if (error.status === 400) return "Chưa thể xác nhận yêu cầu. Vui lòng kiểm tra lại thông tin.";
  }
  return "Chưa thể hoàn tất yêu cầu. Vui lòng thử lại.";
}

export function AccountSettings() {
  const session = useCurrentUser();
  if (session.isPending) return <p role="status" className="px-6 py-20 text-center">Đang tải thông tin tài khoản…</p>;
  if (session.isError) return <div role="alert" className="px-6 py-20 text-center"><p>Chưa tải được tài khoản.</p><Button className="mt-4" onClick={() => void session.refetch()}>Thử lại</Button></div>;
  if (!session.data) return <p className="p-8 text-center"><Link to={APP_PATHS.login} className="underline">Đăng nhập để xem tài khoản</Link></p>;
  return <ProfileEditor key={session.data.id} user={session.data} />;
}

function ProfileEditor({ user }: { user: UserProfileDto }) {
  const { update, avatar, busy } = useProfileActions();
  const { confirmation, requestConfirmation } = useConfirmationDialog();
  const fileInput = useRef<HTMLInputElement>(null);
  const form = useForm<UpdateProfileInput>({ resolver: zodResolver(UpdateProfileSchema), defaultValues: { name: user.name } });
  const initials = user.name.trim().split(/\s+/).slice(-2).map(part => part[0]).join("").toLocaleUpperCase("vi-VN");
  const role = user.role?.split(",").includes("admin") ? "Quản trị viên" : user.role?.split(",").includes("moderator") ? "Biên tập viên" : "Thành viên";

  function reportError(error: unknown) {
    notify.error({ title: "Chưa hoàn tất thay đổi", description: profileError(error) + (error instanceof ApiError && error.requestId ? ` Mã hỗ trợ: ${error.requestId}` : "") });
  }

  return <>
    <ConfirmationDialog {...confirmation} />
    <header className="relative bg-paper-deep px-5 pb-10 pt-36 shadow-[0_16px_32px_-24px_color-mix(in_srgb,var(--color-ink)_28%,transparent)] sm:px-8 md:pb-14 md:pt-40">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start gap-7 sm:flex-row sm:items-center sm:gap-10">
          <Avatar.Root className="relative flex size-36 shrink-0 overflow-hidden rounded-full bg-paper-soft shadow-lg ring-8 ring-paper-soft/40 md:size-48">
            <Avatar.Image src={user.image ?? undefined} alt={`Ảnh đại diện của ${user.name}`} referrerPolicy="no-referrer" className="size-full object-cover" />
            <Avatar.Fallback className="grid size-full place-items-center bg-paper-soft text-5xl font-semibold text-bronze-dark">{initials || "SK"}</Avatar.Fallback>
          </Avatar.Root>
          <div className="min-w-0 flex-1">
            <p className="mb-3 text-sm font-medium text-ink-soft">Tài khoản của bạn</p>
            <h1 className="break-words text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">{user.name}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-3"><CardBadge type="name" tone="neutral">{role}</CardBadge><span className="break-all text-sm text-ink-soft">{user.email}</span></div>
          </div>
        </div>
      </div>
    </header>

    <div className="mx-auto max-w-6xl px-5 pt-12 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
        <section aria-labelledby="account-info-title">
          <h2 id="account-info-title" className="text-2xl font-semibold">Thông tin tài khoản</h2>
          <p className="mt-3 text-sm leading-7 text-ink-soft">Góc riêng của bạn trên hành trình khám phá lịch sử Việt Nam.</p>
          <dl className="mt-8 space-y-6">
            <div><dt className="flex items-center gap-2 text-sm text-ink-soft"><Mail className="size-4" aria-hidden="true" />Email đăng nhập</dt><dd className="mt-2 break-all font-medium">{user.email}</dd></div>
            <div><dt className="mb-2 flex items-center gap-2 text-sm text-ink-soft"><ShieldCheck className="size-4" aria-hidden="true" />Trạng thái email</dt><dd><CardBadge type="status" tone={user.emailVerified ? "success" : "warning"}>{user.emailVerified ? "Đã xác minh" : "Chưa xác minh"}</CardBadge></dd></div>
            <div><dt className="text-sm text-ink-soft">Vai trò</dt><dd className="mt-2 font-medium">{role}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="profile-edit-title" className="rounded-3xl bg-paper-soft p-6 sm:p-8">
          <h2 id="profile-edit-title" className="text-2xl font-semibold">Chỉnh sửa hồ sơ</h2>
          <p className="mt-3 text-sm leading-7 text-ink-soft">Để mỗi câu chuyện luôn gắn với dấu ấn của bạn.</p>
          <div className="mt-7">
            <p className="text-sm font-medium">Ảnh đại diện</p>
            <p id="avatar-help" className="mt-2 text-sm leading-6 text-ink-soft">JPEG, PNG hoặc WebP. Dung lượng tối đa 5 MB.</p>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Chọn ảnh đại diện" aria-describedby="avatar-help" className="sr-only" disabled={busy} onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              if (!file.size || file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                notify.error({ title: "Ảnh chưa hợp lệ", description: "Chọn ảnh JPEG, PNG hoặc WebP từ 1 byte đến 5 MB." });
                return;
              }
              avatar.mutate(file, { onSuccess: () => notify.success({ title: "Đã cập nhật ảnh đại diện." }), onError: reportError });
            }} />
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}><Camera className="size-4" />{avatar.isPending ? "Đang tải ảnh…" : "Đổi ảnh đại diện"}</Button>
              {user.image && <Button type="button" variant="ghost" disabled={busy} onClick={async () => {
                if (!await requestConfirmation({ title: "Xóa ảnh đại diện?", description: "Ảnh hiện tại sẽ được thay bằng chữ viết tắt tên của bạn.", confirmLabel: "Xóa ảnh" })) return;
                update.mutate({ image: null }, { onSuccess: () => notify.success({ title: "Đã xóa ảnh đại diện." }), onError: reportError });
              }}>Xóa ảnh</Button>}
            </div>
          </div>
          <form className="mt-8" onSubmit={form.handleSubmit(values => {
            update.mutate(values, {
              onSuccess: result => { form.reset({ name: result.user.name }); notify.success({ title: "Đã lưu thông tin tài khoản." }); },
              onError: error => {
                if (error instanceof ApiError && error.errorCode === "VALIDATION_ERROR") form.setError("name", { message: "Tên chưa hợp lệ. Vui lòng kiểm tra lại." });
                else reportError(error);
              },
            });
          })}>
            <Label htmlFor="profile-name">Tên hiển thị</Label>
            <Input id="profile-name" autoComplete="name" maxLength={100} disabled={busy} aria-invalid={Boolean(form.formState.errors.name)} aria-describedby="profile-name-help" className="mt-3 bg-paper" {...form.register("name")} />
            <p id="profile-name-help" className="mt-2 text-sm text-ink-soft">{form.formState.errors.name?.message ?? "Tên có từ 2 đến 100 ký tự."}</p>
            <Button type="submit" disabled={busy || !form.formState.isDirty} className="mt-6"><Check className="size-4" />{update.isPending ? "Đang lưu…" : "Lưu thay đổi"}</Button>
          </form>
        </section>
      </div>


    </div>
  </>;
}
