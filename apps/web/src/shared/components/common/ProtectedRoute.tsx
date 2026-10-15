import type { UserRole } from "@repo/shared";
import { Navigate, Outlet, useLocation } from "react-router";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const observedLogoutCount = useIsMutating({ mutationKey: ["auth", "logout"] });
  // A completed logout remains a transition until AppFrame commits the homepage.
  const loggingOut = observedLogoutCount > 0 || queryClient.getMutationCache().findAll({ mutationKey: ["auth", "logout"] })
    .some((mutation) => mutation.state.status === "pending" || mutation.state.status === "success");

  if (currentUserQuery.isPending) return <LoadingSpinner label="Đang kiểm tra quyền truy cập…" />;
  if (currentUserQuery.error) {
    return <ErrorState description={currentUserQuery.error.message} onRetry={() => { void currentUserQuery.refetch(); }} />;
  }
  if (!currentUserQuery.data) {
    if (loggingOut) return <LoadingSpinner label="Đang đăng xuất…" />;
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
