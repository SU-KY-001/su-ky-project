import { Navigate, Outlet } from "react-router";
import { getRoleHomePath } from "../../constants/routes";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { ErrorState } from "./ErrorState";
import { LoadingSpinner } from "./LoadingSpinner";

export function GuestRoute() {
  const currentUserQuery = useCurrentUser();

  if (currentUserQuery.isPending) return <LoadingSpinner label="Đang kiểm tra phiên đăng nhập…" />;
  if (currentUserQuery.error) {
    return <ErrorState description={currentUserQuery.error.message} onRetry={() => { void currentUserQuery.refetch(); }} />;
  }
  if (currentUserQuery.data) {
    return <Navigate to={getRoleHomePath(currentUserQuery.data.role)} replace />;
  }

  return <Outlet />;
}
