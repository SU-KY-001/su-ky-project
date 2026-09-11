# Phase 4: Frontend Starter Scaffolding (`apps/web`)

## Goal
Scaffold a clean, modern, and standard frontend starter ("project khung") for the frontend team to take over, adhering to user requirement "đừng có đụng nhiều vào frontend, chỉ cần tạo project khung thôi rồi team frontend tự lo".

## Files to Create
1. `apps/web/package.json`:
   - Name: `@repo/web`
   - Dependencies: `react@^19.0.0`, `react-dom@^19.0.0`, `@tanstack/react-query@^5.66.0`, `lucide-react@^0.475.0`, `hono@^4.7.0`
   - DevDependencies: `vite@^6.2.0`, `@vitejs/plugin-react@^4.3.4`, `@tailwindcss/vite@^4.0.0`, `tailwindcss@^4.0.0`, `@repo/api@workspace:*`, `@repo/shared@workspace:*`, `@repo/tsconfig@workspace:*`, `typescript@^5.8.2`
2. `apps/web/tsconfig.json`:
   - Extends `@repo/tsconfig/react.json`
3. `apps/web/vite.config.ts`:
   - Vite 6 config with `@vitejs/plugin-react` and `@tailwindcss/vite`
4. `apps/web/index.html`:
   - Root HTML document, sets title "Su-Ky — Nền Tảng Podcast Lịch Sử Việt Nam", Google Fonts preconnect.
5. `apps/web/src/globals.css`:
   - Tailwind CSS v4 setup: `@import "tailwindcss";`
   - Base dark mode aesthetic tokens.
6. `apps/web/src/lib/api.ts`:
   - Typed Hono RPC client instance:
   ```typescript
   import { hc } from 'hono/client';
   import type { AppType } from '@repo/api/types';
   export const api = hc<AppType>(import.meta.env.VITE_API_URL || 'http://localhost:3000');
   ```
7. `apps/web/src/App.tsx`:
   - Clean starter shell showing:
     - Header with "Su-Ky" branding & badge
     - System Connectivity status (pings Hono `/health` endpoint via typed RPC)
     - Demo Timeline / Series cards fetching live data from Hono backend
     - Clear comment blocks and component boundaries for the frontend team
8. `apps/web/src/main.tsx`:
   - React 19 entrypoint with `QueryClientProvider`.

## Verification
- `apps/web` compiles cleanly with `vite build`.
