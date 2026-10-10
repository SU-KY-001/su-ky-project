import type { UserRole } from "@repo/shared";
import { Navigate, Outlet, useLocation } from "react-router";
import { APP_PATHS, hasAnyRole } from "../../constants/routes";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { ErrorState } from "./ErrorState";
import { LoadingSpinner } from "./LoadingSpinner";

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const currentUserQuery = useCurrentUser();

  if (currentUserQuery.isPending) return <LoadingSpinner label="Đang kiểm tra quyền truy cập…" />;
  if (currentUserQuery.error) {
    return <ErrorState description={currentUserQuery.error.message} onRetry={() => { void currentUserQuery.refetch(); }} />;
  }
  if (!currentUserQuery.data) {
    return (
      <Navigate
        to={APP_PATHS.login}
        replace
        state={{ from: { pathname: location.pathname, search: location.search, hash: location.hash } }}
      />
    );
  }
  if (!hasAnyRole(currentUserQuery.data.role, allowedRoles)) {
    return <Navigate to={APP_PATHS.unauthorized} replace />;
  }

  return <Outlet />;
}
