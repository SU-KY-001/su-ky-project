import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, CircleNotch, Key, UserCircle } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import type { CurrentUser } from "@/shared/types/auth";
import { MainHeader } from "@/shared/components/common/MainHeader";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { currentUserQueryKey } from "@/shared/services/currentUserService";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordValues,
  type UpdateProfileValues,
} from "@/features/profile/schemas/profileSchema";
import { profileService } from "@/features/profile/services/profileService";

function FieldError({ message }: { message?: string }): React.ReactElement | null {
  return message ? <p className="text-xs text-vermilion" role="alert">{message}</p> : null;
}

function ProfileForms({ user }: { user: CurrentUser }): React.ReactElement {
  const queryClient = useQueryClient();
  const profileForm = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user.name, image: user.image ?? "" },
    mode: "onTouched",
  });
  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    mode: "onTouched",
  });
  const image = profileForm.watch("image");

  const profileMutation = useMutation({
    mutationFn: profileService.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
    },
  });
  const passwordMutation = useMutation({
    mutationFn: profileService.changePassword,
    onSuccess: () => passwordForm.reset(),
  });

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-5 py-10 md:grid-cols-2">
      <section className="rounded-2xl border border-line bg-paper-soft p-6" aria-labelledby="profile-heading">
        <div className="mb-6 flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-bronze/40 bg-paper-deep text-ink-soft">
            {image ? <img src={image} alt="Ảnh đại diện xem trước" className="size-full object-cover" /> : <UserCircle size={38} aria-hidden />}
          </span>
          <div>
            <h2 id="profile-heading" className="font-serif text-xl font-bold text-ink">Hồ sơ cá nhân</h2>
            <p className="mt-1 text-sm text-ink-soft">{user.email}</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={profileForm.handleSubmit((values) => profileMutation.mutate(values))} noValidate>
          <div className="space-y-2">
            <Label htmlFor="profile-name">Tên hiển thị</Label>
            <Input id="profile-name" autoComplete="name" aria-invalid={Boolean(profileForm.formState.errors.name)} {...profileForm.register("name")} />
            <FieldError message={profileForm.formState.errors.name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-image">Đường dẫn ảnh đại diện</Label>
            <Input id="profile-image" type="url" placeholder="https://..." aria-invalid={Boolean(profileForm.formState.errors.image)} {...profileForm.register("image")} />
            <p className="text-xs text-ink-soft">Để trống nếu muốn bỏ ảnh đại diện hiện tại.</p>
            <FieldError message={profileForm.formState.errors.image?.message} />
          </div>
          {profileMutation.isSuccess ? <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle weight="fill" />Đã cập nhật hồ sơ.</p> : null}
          {profileMutation.error ? <p className="text-sm text-vermilion" role="alert">{profileMutation.error.message}</p> : null}
          <Button type="submit" disabled={profileMutation.isPending} className="bg-vermilion text-paper-soft hover:bg-vermilion-dark">
            {profileMutation.isPending ? <CircleNotch className="animate-spin" /> : null}
            Lưu hồ sơ
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-line bg-paper-soft p-6" aria-labelledby="password-heading">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-bronze/15 text-bronze-dark"><Key size={23} weight="fill" aria-hidden /></span>
          <div>
            <h2 id="password-heading" className="font-serif text-xl font-bold text-ink">Đổi mật khẩu</h2>
            <p className="mt-1 text-sm text-ink-soft">Các phiên đăng nhập khác sẽ được thu hồi.</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={passwordForm.handleSubmit((values) => passwordMutation.mutate(values))} noValidate>
          {([
            ["currentPassword", "Mật khẩu hiện tại", "current-password"],
            ["newPassword", "Mật khẩu mới", "new-password"],
            ["confirmPassword", "Nhập lại mật khẩu mới", "new-password"],
          ] as const).map(([name, label, autoComplete]) => (
            <div className="space-y-2" key={name}>
              <Label htmlFor={`profile-${name}`}>{label}</Label>
              <Input id={`profile-${name}`} type="password" autoComplete={autoComplete} aria-invalid={Boolean(passwordForm.formState.errors[name])} {...passwordForm.register(name)} />
              <FieldError message={passwordForm.formState.errors[name]?.message} />
            </div>
          ))}
          {passwordMutation.isSuccess ? <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle weight="fill" />Đã đổi mật khẩu.</p> : null}
          {passwordMutation.error ? <p className="text-sm text-vermilion" role="alert">{passwordMutation.error.message}</p> : null}
          <Button type="submit" disabled={passwordMutation.isPending} className="bg-vermilion text-paper-soft hover:bg-vermilion-dark">
            {passwordMutation.isPending ? <CircleNotch className="animate-spin" /> : null}
            Đổi mật khẩu
          </Button>
        </form>
      </section>
    </main>
  );
}

export function ProfilePage(): React.ReactElement {
  const { data: user } = useCurrentUser();
  return (
    <div className="min-h-screen bg-paper">
      <MainHeader />
      <header className="bg-night py-10 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-bronze">Tài khoản người nghe</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-paper-soft">Quản lý tài khoản</h1>
      </header>
      {user ? <ProfileForms key={`${user.name}-${user.image ?? ""}`} user={user} /> : null}
    </div>
  );
}
