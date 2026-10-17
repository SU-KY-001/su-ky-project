import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  envDir: resolve(appRoot, "../.."),
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": resolve(appRoot, "src"),
    },
  },
  server: {
    port: 3000,
  },
});
