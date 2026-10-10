import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "lenis/dist/lenis.css";
import { QueryProvider } from "./app/providers/QueryProvider";
import { App } from "./App";
import "./styles/globals.css";

window.history.scrollRestoration = "manual";
if (!window.location.hash) window.scrollTo(0, 0);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element in index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>
);
