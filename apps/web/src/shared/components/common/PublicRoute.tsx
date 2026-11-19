import { useIsMutating } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { Navigate, Outlet } from "react-router";
import { APP_PATHS, getRoleHomePath } from "../../constants/routes";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { ErrorState } from "./ErrorState";

export function PublicRoute({ fallback }: { fallback: ReactElement }): ReactElement {
  const session = useCurrentUser();
  const authenticating = useIsMutating({ mutationKey: ["auth", "authenticate"] }) > 0;
  if (session.isPending) return fallback;
  if (session.error) return <ErrorState description={session.error.message} onRetry={() => { void session.refetch(); }} />;
  const home = getRoleHomePath(session.data?.role);
  if (home !== APP_PATHS.home && !authenticating) return <Navigate to={home} replace />;
  return <Outlet />;
}
