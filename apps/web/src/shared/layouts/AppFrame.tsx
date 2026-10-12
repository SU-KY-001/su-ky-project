import { useLayoutEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigation } from "react-router";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { APP_PATHS } from "../constants/routes";
import { currentUserQueryKey } from "../services/currentUserService";
import { AppToaster } from "../components/common/AppToaster";

export function AppFrame() {
  const navigation = useNavigation();
  const location = useLocation();
  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    if (location.pathname !== APP_PATHS.home || queryClient.getQueryData(currentUserQueryKey) !== null) return;
    const logout = queryClient.getMutationCache().findAll({ mutationKey: ["auth", "logout"] })
      .some((mutation) => mutation.state.status === "pending" || mutation.state.status === "success");
    // Clear private mutation data after the protected outlet has unmounted.
    if (logout) queryClient.getMutationCache().clear();
  }, [location.key, location.pathname, queryClient]);

  return (
    <>
      <Outlet />
      <AppToaster />
      {navigation.state !== "idle" ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-paper/60 backdrop-blur-sm" aria-label="Đang chuyển trang">
          <LoadingSpinner label="Đang chuyển trang…" fullScreen={false} />
        </div>
      ) : null}
    </>
  );
}
