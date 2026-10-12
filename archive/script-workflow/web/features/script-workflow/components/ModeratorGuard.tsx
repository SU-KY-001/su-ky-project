import type { ReactNode } from "react";
import { Link, Outlet } from "react-router";
import { CircleNotch, LockKey, ShieldWarning } from "@phosphor-icons/react";
import { DevLoginButton } from "@/features/auth-dev/DevLoginButton";
import { useSession } from "@/features/auth-dev/useSession";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/800.css";

const MODERATOR_ROLE = "moderator";

function GuardMessage({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children?: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-mod-canvas p-6 font-moderator text-mod-text">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-[16px] border border-mod-border bg-mod-surface p-8 text-center" role="status" aria-live="polite">
        {icon}
        <ModeratorText as="h1" className="text-xl font-extrabold tracking-tight">{title}</ModeratorText>
        <ModeratorText className="text-sm text-mod-text-secondary">{description}</ModeratorText>
        {children}
      </div>
    </div>
  );
}

/** Layout route: only a signed-in `moderator` reaches the script-workflow pages. */
export function ModeratorGuard() {
  const session = useSession();

  if (session.isPending) {
    return (
      <GuardMessage
        icon={<CircleNotch size={28} className="animate-spin text-mod-primary" aria-hidden={true} />}
        title="Đang kiểm tra đăng nhập"
        description="Vui lòng chờ trong giây lát."
      />
    );
  }

  if (session.isError) {
    return (
      <GuardMessage
        icon={<ShieldWarning size={28} className="text-mod-danger" aria-hidden={true} />}
        title="Không kiểm tra được đăng nhập"
        description={session.error.message}
      />
    );
  }

  if (!session.data) {
    return (
      <GuardMessage
        icon={<LockKey size={28} className="text-mod-attention" aria-hidden={true} />}
        title="Cần đăng nhập"
        description="Đăng nhập bằng tài khoản Moderator để quản lý kịch bản podcast."
      >
        <DevLoginButton />
      </GuardMessage>
    );
  }

  if (session.data.role !== MODERATOR_ROLE) {
    return (
      <GuardMessage
        icon={<ShieldWarning size={28} className="text-mod-danger" aria-hidden={true} />}
        title="Bạn không có quyền truy cập"
        description="Chỉ tài khoản Moderator mới dùng được khu vực này."
      >
        <Link to="/" className="text-sm font-bold text-mod-primary">Về trang chủ</Link>
      </GuardMessage>
    );
  }

  return <Outlet />;
}
