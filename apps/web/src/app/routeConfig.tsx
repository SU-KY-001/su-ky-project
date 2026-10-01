import type { RouteObject } from "react-router";
import { AppShell } from "../shared/components/AppShell";
import { EpisodePage } from "../pages/episode/EpisodePage";
import { HomePage } from "../pages/home/HomePage";
import { NotFoundPage } from "../pages/not-found/NotFoundPage";
import { SearchPage } from "../pages/search/SearchPage";
import { SeriesDetailPage } from "../pages/series/SeriesDetailPage";
import { SeriesPage } from "../pages/series/SeriesPage";
import { TimelinePage } from "../pages/timeline/TimelinePage";

export const appRoutes: RouteObject[] = [
  {
    id: "app-shell",
    path: "/",
    element: <AppShell />,
    children: [
      { id: "home", index: true, element: <HomePage /> },
      { id: "timeline", path: "timeline", element: <TimelinePage /> },
      { id: "series", path: "series", element: <SeriesPage /> },
      {
        id: "series-detail",
        path: "series/:slug",
        element: <SeriesDetailPage />,
      },
      {
        id: "episode-detail",
        path: "episodes/:slug",
        element: <EpisodePage />,
      },
      { id: "search", path: "search", element: <SearchPage /> },
      { id: "not-found", path: "*", element: <NotFoundPage /> },
    ],
  },
];
