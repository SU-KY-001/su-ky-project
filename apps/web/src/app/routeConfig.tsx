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
  {
    id: "moderator-script-workflows",
    path: "/moderator/script-workflows",
    errorElement: <RouteErrorFallback />,
    lazy: async () => {
      const { ModeratorGuard } = await import("../features/script-workflow/components/ModeratorGuard");
      return { Component: ModeratorGuard };
    },
    children: [
      // Route-level code splitting: pages load on demand, same as the other lazy routes in this file.
      {
        id: "moderator-script-workflow-list",
        index: true,
        errorElement: <RouteErrorFallback />,
        lazy: async () => {
          const { ScriptWorkflowListPage } = await import("../pages/moderator/script-workflows/ScriptWorkflowListPage");
          return { Component: ScriptWorkflowListPage };
        },
      },
      {
        id: "moderator-script-workflow-create",
        path: "new",
        errorElement: <RouteErrorFallback />,
        lazy: async () => {
          const { ScriptWorkflowCreatePage } = await import("../pages/moderator/script-workflows/ScriptWorkflowCreatePage");
          return { Component: ScriptWorkflowCreatePage };
        },
      },
      {
        id: "moderator-script-workflow-workspace",
        path: ":id",
        errorElement: <RouteErrorFallback />,
        lazy: async () => {
          const { ScriptWorkflowWorkspacePage } = await import("../pages/moderator/script-workflows/ScriptWorkflowWorkspacePage");
          return { Component: ScriptWorkflowWorkspacePage };
        },
      },
      {
        id: "moderator-script-workflow-publication",
        path: ":id/publication",
        errorElement: <RouteErrorFallback />,
        lazy: async () => {
          // Route-level code splitting: load publication page on demand.
          const { ScriptWorkflowPublicationPage } = await import("../pages/moderator/script-workflows/ScriptWorkflowPublicationPage");
          return { Component: ScriptWorkflowPublicationPage };
        },
      },
    ],
  },
];
