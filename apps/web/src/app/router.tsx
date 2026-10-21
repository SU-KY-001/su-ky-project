import { createBrowserRouter, redirect, redirectDocument, type RouteObject } from "react-router";
import { GuestRoute, ProtectedRoute, RouteErrorFallback } from "@/shared/components/common";
import { AppLoadingFallback } from "./AppLoadingFallback";
import { APP_PATHS } from "@/shared/constants/routes";
import { AppFrame } from "@/shared/layouts/AppFrame";
import { LoginPage } from "@/pages/auth/LoginPage";
import { apiUrl } from "@/lib/client";
import { PublicRoute } from "@/shared/components/common/PublicRoute";
import { LandingLoadingPage } from "@/pages/landing/LandingLoadingPage";

export const appRoutes: RouteObject[] = [
  {
    id: "app",
    path: APP_PATHS.home,
    Component: AppFrame,
    HydrateFallback: AppLoadingFallback,
    ErrorBoundary: RouteErrorFallback,
    children: [
      {
        id: "history-library-wireframe",
        path: "wireframes/history-library",
        lazy: async () => {
          const { HistoryLibraryWireframePage } = await import("../pages/wireframes/HistoryLibraryWireframePage");
          return { Component: HistoryLibraryWireframePage };
        },
      },
      {
        id: "history-design-wireframe",
        path: "wireframes/history",
        lazy: async () => {
          const { HistoryDesignWireframePage } = await import("../pages/wireframes/HistoryDesignWireframePage");
          return { Component: HistoryDesignWireframePage };
        },
      },
      {
        id: "podcast-showcase-wireframe",
        path: "wireframes/podcast-showcase",
        lazy: async () => {
          const { PodcastShowcaseWireframePage } = await import("../pages/wireframes/PodcastShowcaseWireframePage");
          return { Component: PodcastShowcaseWireframePage };
        },
      },
      {id:"historical-event",path:"history/events/:slug",lazy:async()=>{const {HistoricalEventPage}=await import("../pages/history/HistoricalEventPage");return {Component:HistoricalEventPage};}},
      {
        id: "public-routes",
        element: <PublicRoute fallback={<LandingLoadingPage />} />,
        children: [
          {
            id: "landing",
            lazy: async () => {
              const { LandingPage } = await import("../pages/landing/LandingPage");
              return { Component: LandingPage };
            },
            children: [
              { id: "landing-home", index: true, element: null },
              {
                id: "guest-routes",
                element: <GuestRoute />,
                children: [{ id: "login", path: APP_PATHS.login.slice(1), Component: LoginPage }],
              },
            ],
          },
        ],
      },
      {
        id: "swagger-docs",
        path: APP_PATHS.docs.slice(1),
        loader: () => redirectDocument(`${apiUrl}${APP_PATHS.docs}`),
      },
      {
        id: "moderator-routes",
        element: <ProtectedRoute allowedRoles={["moderator"]} />,
        children: [
          {
            id: "moderator-dashboard",
            path: APP_PATHS.moderator.slice(1),
            lazy: async () => {
              const { ModeratorWorkspacePage } = await import("../pages/moderator/ModeratorWorkspacePage");
              return { Component: ModeratorWorkspacePage };
            },
          },
          {
            id: "moderator-legacy-menu",
            path: `${APP_PATHS.moderator.slice(1)}/*`,
            element: null,
            loader: () => redirect(APP_PATHS.moderator),
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
          {
            id: "admin-legacy-menu",
            path: `${APP_PATHS.admin.slice(1)}/*`,
            element: null,
            loader: () => redirect(APP_PATHS.admin),
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
