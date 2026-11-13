import { Navigate, Outlet } from "react-router";
import { useIsMutating } from "@tanstack/react-query";
import { getRoleHomePath } from "../../constants/routes";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { ErrorState } from "./ErrorState";
import { LoadingSpinner } from "./LoadingSpinner";

export function GuestRoute() {
  const currentUserQuery = useCurrentUser();
  const authenticating = useIsMutating({ mutationKey: ["auth", "authenticate"] }) > 0;

  if (currentUserQuery.isPending) return <div className="fixed inset-0 z-50 grid place-items-center bg-night/45"><LoadingSpinner label="Đang kiểm tra phiên đăng nhập…" fullScreen={false} /></div>;
  if (currentUserQuery.error) {
    return <div className="fixed inset-0 z-50 overflow-auto bg-paper"><ErrorState description={currentUserQuery.error.message} onRetry={() => { void currentUserQuery.refetch(); }} /></div>;
  }
  if (currentUserQuery.data && !authenticating) {
    return <Navigate to={getRoleHomePath(currentUserQuery.data.role)} replace />;
  }

  return <Outlet />;
}
