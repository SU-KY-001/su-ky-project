import { createBrowserRouter, redirect, redirectDocument, type RouteObject } from "react-router";
import { GuestRoute, LoadingSpinner, ProtectedRoute, RouteErrorFallback } from "@/shared/components/common";
import { APP_PATHS } from "@/shared/constants/routes";
import { AppFrame } from "@/shared/layouts/AppFrame";
import { ModeratorLayout } from "@/features/moderator/components/ModeratorLayout";
import { PODCAST_PRODUCTION_PATH } from "@/features/moderator/navItems";

const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

export const appRoutes: RouteObject[] = [
  {
    id: "app",
    path: APP_PATHS.home,
    Component: AppFrame,
    HydrateFallback: LoadingSpinner,
    ErrorBoundary: RouteErrorFallback,
    children: [
      {
        id: "landing",
        index: true,
        lazy: async () => {
          const { LandingPage } = await import("../pages/landing/LandingPage");
          return { Component: LandingPage };
        },
      },
      {
        id: "swagger-docs",
        path: APP_PATHS.docs.slice(1),
        loader: () => redirectDocument(`${apiUrl}${APP_PATHS.docs}`),
      },
      {
        id: "guest-routes",
        element: <GuestRoute />,
        children: [
          {
            id: "login",
            path: APP_PATHS.login.slice(1),
            lazy: async () => {
              const { LoginPage } = await import("../pages/auth/LoginPage");
              return { Component: LoginPage };
            },
          },
        ],
      },
      {
        id: "moderator-routes",
        element: <ProtectedRoute allowedRoles={["moderator"]} />,
        children: [
          {
            id: "moderator-shell",
            Component: ModeratorLayout,
            children: [
              {
                id: "moderator-dashboard",
                path: APP_PATHS.moderator.slice(1),
                lazy: async () => {
                  const { ModeratorDashboardPage } = await import("../pages/moderator/ModeratorDashboardPage");
                  return { Component: ModeratorDashboardPage };
                },
              },
              {
                id: "moderator-podcast-production",
                path: "moderator/podcast",
                lazy: async () => {
                  const { PodcastProductionPage } = await import("../pages/moderator/PodcastProductionPage");
                  return { Component: PodcastProductionPage };
                },
              },
              {
                id: "moderator-timeline",
                path: "moderator/timeline",
                lazy: async () => {
                  const { ModeratorDashboardPage } = await import("../pages/moderator/ModeratorDashboardPage");
                  return { Component: ModeratorDashboardPage };
                },
              },
              {
                id: "moderator-retired-script-workflows",
                path: "moderator/script-workflows/*",
                loader: () => redirect(PODCAST_PRODUCTION_PATH),
              },
              {
                id: "moderator-library-features",
                path: "moderator/:section",
                lazy: async () => {
                  const { ModeratorLibraryFeaturePage } = await import("../pages/moderator/ModeratorLibraryFeaturePage");
                  return { Component: ModeratorLibraryFeaturePage };
                },
              },
            ],
          },
        ],
      },
      {
        id: "admin-routes",
        element: <ProtectedRoute allowedRoles={["admin"]} />,
        children: [
          {
            id: "admin-dashboard",
            path: APP_PATHS.admin.slice(1),
            lazy: async () => {
              const { AdminDashboardPage } = await import("../pages/admin/AdminDashboardPage");
              return { Component: AdminDashboardPage };
            },
          },
        ],
      },
      {
        id: "unauthorized",
        path: APP_PATHS.unauthorized.slice(1),
        lazy: async () => {
          const { UnauthorizedPage } = await import("@/shared/pages/UnauthorizedPage");
          return { Component: UnauthorizedPage };
        },
      },
      {
        id: "not-found",
        path: "*",
        lazy: async () => {
          const { NotFoundPage } = await import("@/shared/pages/NotFoundPage");
          return { Component: NotFoundPage };
        },
      },
    ],
  },
];

export const router = createBrowserRouter(appRoutes);
