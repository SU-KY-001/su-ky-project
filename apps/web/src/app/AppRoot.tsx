import { useLayoutEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./router";

const LANDING_LOADER_MIN_VISIBLE_MS = 1200;
const LANDING_LOADER_EXIT_MS = 460;

export function App() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains("landing-boot-pending")) return undefined;

    const startedAt = Number(html.dataset.landingBootStartedAt);
    const elapsed = Number.isFinite(startedAt) ? Math.max(0, performance.now() - startedAt) : 0;
    let exitTimer: number | undefined;

    const readyTimer = window.setTimeout(() => {
      html.classList.add("landing-boot-exiting");
      const exitDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 1
        : LANDING_LOADER_EXIT_MS;

      exitTimer = window.setTimeout(() => {
        html.classList.remove("landing-boot-pending", "landing-boot-exiting");
        delete html.dataset.landingBootStartedAt;
      }, exitDuration);
    }, Math.max(0, LANDING_LOADER_MIN_VISIBLE_MS - elapsed));

    return () => {
      window.clearTimeout(readyTimer);
      if (exitTimer !== undefined) window.clearTimeout(exitTimer);
    };
  }, []);

  return <RouterProvider router={router} />;
}

export default App;
