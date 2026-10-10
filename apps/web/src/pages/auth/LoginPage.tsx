import { lazy, Suspense, useEffect, type ReactElement } from "react";
import { ChunkErrorBoundary } from "@/shared/components/common/ChunkErrorBoundary";
import { LandingPage } from "../landing/LandingPage";

const LoginDialog = lazy(() =>
  import("./LoginDialog").then(({ LoginDialog: Dialog }) => ({ default: Dialog }))
);

function LoginDialogLoadError() {
  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-xl border border-line bg-paper-soft p-4 text-sm text-ink shadow-lg" role="alert">
      <p>Không tải được cửa sổ đăng nhập.</p>
      <button className="mt-2 font-semibold text-vermilion underline" onClick={() => window.location.reload()}>
        Thử tải lại
      </button>
    </div>
  );
}

export function LoginPage(): ReactElement {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Đăng nhập | Sử Ký";
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <>
      <LandingPage />
      <ChunkErrorBoundary fallback={<LoginDialogLoadError />}>
        <Suspense fallback={null}>
          <LoginDialog />
        </Suspense>
      </ChunkErrorBoundary>
    </>
  );
}
