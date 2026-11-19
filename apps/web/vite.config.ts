import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(import.meta.url));
const sharedRoot = resolve(appRoot, "../../packages/shared/src");

export default defineConfig({
  envDir: resolve(appRoot, "../.."),
  plugins: [tailwindcss(), react(), {
    name: "watch-workspace-shared",
    configureServer(server) {
      server.watcher.add(sharedRoot);
    },
  }],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": resolve(appRoot, "src"),
      "@repo/shared": resolve(sharedRoot, "index.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["@phosphor-icons/react", "@repo/shared"],
  },
  server: {
    port: 3000,
    watch: process.platform === "win32" ? { usePolling: true, interval: 300 } : undefined,
  },
});
