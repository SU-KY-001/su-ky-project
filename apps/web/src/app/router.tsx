import { createBrowserRouter, redirect, redirectDocument, type RouteObject } from "react-router";
import { GuestRoute, ProtectedRoute, RouteErrorFallback } from "@/shared/components/common";
import { AppLoadingFallback } from "./AppLoadingFallback";
import { APP_PATHS } from "@/shared/constants/routes";
import { MODERATOR_SECTION_SEGMENTS } from "@/features/moderator/paths";
import { AppFrame } from "@/shared/layouts/AppFrame";
import { apiUrl } from "@/lib/client";
import { PublicRoute } from "@/shared/components/common/PublicRoute";
import { LandingLoadingPage } from "@/pages/landing/LandingLoadingPage";

export const appRoutes: RouteObject[] = [
  { id: "public-exhibition", path: "/trien-lam/:slug", ErrorBoundary: RouteErrorFallback, HydrateFallback: AppLoadingFallback, lazy: async () => { const { ExhibitionPage } = await import("../pages/exhibition/ExhibitionPage"); return { Component: ExhibitionPage }; } },
  {
    id: "app",
    path: APP_PATHS.home,
    Component: AppFrame,
    HydrateFallback: AppLoadingFallback,
    ErrorBoundary: RouteErrorFallback,
    children: [
      {
        id: "quiz-player-auth",
        element: <ProtectedRoute allowedRoles={["user", "moderator", "admin"]} />,
        children: [{ id: "quiz-player", path: "quiz/:slug", lazy: async () => {
          const { QuizPlayerPage } = await import("../pages/quiz/QuizPlayerPage");
          return { Component: QuizPlayerPage };
        } }],
      },
      {
        id: "public-series-episodes",
        path: "series/:slug",
        lazy: async () => {
          const { SeriesEpisodesPage } = await import("../pages/series/SeriesEpisodesPage");
          return { Component: SeriesEpisodesPage };
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
                children: [{
                  id: "login",
                  path: APP_PATHS.login.slice(1),
                  lazy: async () => {
                    const { LoginPage } = await import("@/pages/auth/LoginPage");
                    return { Component: LoginPage };
                  },
                }],
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
            id: "moderator-workspace",
            path: APP_PATHS.moderator.slice(1),
            lazy: async () => {
              const { ModeratorWorkspacePage } = await import("../pages/moderator/ModeratorWorkspacePage");
              return { Component: ModeratorWorkspacePage };
            },
            // Child routes only declare valid URLs (unknown ones fall through to 404); the page renders the screen itself.
            children: [
              { id: "moderator-overview", index: true },
              ...MODERATOR_SECTION_SEGMENTS.filter((section) => section !== "podcast" && section !== "exhibitions").map((section) => ({ id: `moderator-${section}`, path: section })),
              { id: "moderator-exhibitions", path: "exhibitions", children: [
                { id: "moderator-exhibitions-list", index: true, element: <></> },
                { id: "moderator-exhibitions-new", path: "new", element: <></> },
                { id: "moderator-exhibitions-edit", path: ":id/edit", element: <></> },
                { id: "moderator-exhibitions-preview", path: ":id/preview", element: <></> },
              ] },
              {
                id: "moderator-podcast",
                path: "podcast",
                children: [
                  { id: "moderator-podcast-list", index: true },
                  { id: "moderator-podcast-new-series", path: "series/new" },
                  { id: "moderator-podcast-series", path: "series/:seriesId" },
                  { id: "moderator-podcast-new-episode", path: "episodes/new" },
                  { id: "moderator-podcast-episode", path: "episodes/:episodeId" },
                ],
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
