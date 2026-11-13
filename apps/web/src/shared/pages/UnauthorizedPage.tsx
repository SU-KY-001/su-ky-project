import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { APP_PATHS } from "../constants/routes";

export function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-paper px-5 py-12 text-center">
      <p className="font-semibold tracking-[0.2em] text-vermilion">403</p>
      <div className="flex max-w-lg flex-col gap-2">
        <h1 className="font-serif text-3xl font-bold text-ink">Bạn không có quyền truy cập</h1>
        <p className="text-base leading-7 text-ink-soft">Tài khoản hiện tại không được cấp quyền xem trang này.</p>
      </div>
      <Button asChild className="rounded-full bg-vermilion px-5 text-paper-soft hover:bg-vermilion-dark">
        <Link to={APP_PATHS.home}>Về trang chính</Link>
      </Button>
    </main>
  );
}
