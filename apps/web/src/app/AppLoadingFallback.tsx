import type { ReactElement } from "react";
import { useLocation } from "react-router";
import { LandingLoadingPage } from "@/pages/landing/LandingLoadingPage";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { APP_PATHS } from "@/shared/constants/routes";

export function AppLoadingFallback(): ReactElement {
  const { pathname } = useLocation();
  return pathname === APP_PATHS.home || pathname === APP_PATHS.login ? <LandingLoadingPage /> : <LoadingSpinner />;
}
