import { lazy, Suspense } from "react";
import { ArrowClockwise, WifiSlash } from "@phosphor-icons/react";
import { isRouteErrorResponse, Navigate, useLocation, useRouteError } from "react-router";
import { APP_PATHS } from "../../constants/routes";
import { Button } from "../ui/button";
import { LoadingSpinner } from "./LoadingSpinner";

const NotFoundPage = lazy(() => import("../../pages/NotFoundPage").then(({ NotFoundPage: Page }) => ({ default: Page })));
const UnauthorizedPage = lazy(() => import("../../pages/UnauthorizedPage").then(({ UnauthorizedPage: Page }) => ({ default: Page })));

export function RouteErrorFallback() {
  const error = useRouteError();
  const location = useLocation();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <Suspense fallback={<LoadingSpinner label="Đang tải trang lỗi…" />}><NotFoundPage /></Suspense>;
    }
    if (error.status === 401) {
      return (
        <Navigate
          to={APP_PATHS.login}
          replace
          state={{ from: { pathname: location.pathname, search: location.search, hash: location.hash } }}
        />
      );
    }
    if (error.status === 403) {
      return <Suspense fallback={<LoadingSpinner label="Đang tải trang lỗi…" />}><UnauthorizedPage /></Suspense>;
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-5 py-10 text-center" role="alert">
      <div className="grid size-16 place-items-center rounded-full bg-paper-deep text-ink-soft">
        <WifiSlash size={28} aria-hidden="true" />
      </div>
      <div className="flex max-w-[420px] flex-col items-center gap-2">
        <h1 className="font-serif text-3xl font-bold text-ink">Chưa tải được trang</h1>
        <p className="text-base leading-7 text-ink-soft">
          Kết nối có thể đã bị gián đoạn. Bạn có thể thử tải lại trang.
        </p>
      </div>
      <Button className="rounded-full bg-vermilion px-5 text-paper-soft hover:bg-vermilion-dark" onClick={() => window.location.reload()}>
        <ArrowClockwise size={18} aria-hidden="true" />
        Thử tải lại
      </Button>
    </main>
  );
}
