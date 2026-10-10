import type { RouteObject } from "react-router";
import { RouteErrorFallback } from "./RouteErrorFallback";

type LandingPageModule = typeof import("../pages/landing/LandingPage");
let landingPagePromise: Promise<LandingPageModule> | undefined;

export function preloadLandingPage(): Promise<LandingPageModule> {
  landingPagePromise ??= import("../pages/landing/LandingPage");
  return landingPagePromise;
}

export const appRoutes: RouteObject[] = [
  {
    id: "login",
    path: "/login",
    errorElement: <RouteErrorFallback />,
    lazy: async () => {
      const { LoginPage } = await import("../pages/auth/LoginPage");
      return { Component: LoginPage };
    },
  },
  {
    id: "landing",
    path: "/",
    errorElement: <RouteErrorFallback />,
    lazy: async () => {
      const { LandingPage } = await preloadLandingPage();
      return { Component: LandingPage };
    },
  },
  {
    id: "moderator-dashboard",
    path: "/moderator",
    errorElement: <RouteErrorFallback />,
    lazy: async () => {
      const { ModeratorDashboardPage } = await import("../pages/moderator/ModeratorDashboardPage");
      return { Component: ModeratorDashboardPage };
    },
  },
];
