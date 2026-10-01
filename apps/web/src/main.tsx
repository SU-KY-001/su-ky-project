import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryProvider } from "./app/providers/QueryProvider";
import { App } from "./App";
import "./globals.css";

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
