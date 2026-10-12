import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { currentUserQueryKey } from "@/shared/services/currentUserService";
import { useAuthDialog } from "./useAuthDialog";
import { notify } from "@/shared/lib/notifications";

const originalFetch = globalThis.fetch;
let root: Root;
let client: QueryClient;
afterEach(() => {
  act(() => { notify.dismiss(); root?.unmount(); });
  client?.clear();
  globalThis.fetch = originalFetch;
  document.body.innerHTML = "";
});

function AuthenticationProbe() {
  const auth = useAuthDialog();
  return <>
    <button id="login-a" onClick={() => auth.signIn({ email: "a@example.com", password: "password-a", rememberMe: false })}>Login A</button>
    <button id="clear-error" onClick={auth.clearSignInError}>Clear error</button>
    <button id="login-b" onClick={() => auth.signIn({ email: "b@example.com", password: "password-b", rememberMe: false })}>Login B</button>
    <button id="signup" onClick={() => auth.signUp({ email: "c@example.com", name: "C", password: "password-c", confirmPassword: "password-c" })}>Sign up</button>
    <output>{auth.signInPending ? "pending" : "idle"}</output>
  </>;
}

it("keeps authentication pending and prevents competing submissions after error clearing or dialog remount", async () => {
  const responses: Array<(response: Response) => void> = [];
  globalThis.fetch = Object.assign(async (input: URL | RequestInfo) => {
    if (String(input).endsWith("/api/me")) return Response.json({ user: { id: "a", name: "A", email: "a@example.com", emailVerified: true, role: "user" }, session: { expiresAt: "2026-12-01T00:00:00.000Z" } });
    return new Promise<Response>((resolve) => { responses.push(resolve); });
  }, { preconnect: originalFetch.preconnect });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(currentUserQueryKey, null);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const renderProbe = (key: string) => <QueryClientProvider client={client}><MemoryRouter><AuthenticationProbe key={key} /></MemoryRouter></QueryClientProvider>;
  await act(async () => { root.render(renderProbe("first")); });
  await act(async () => { document.getElementById("login-a")?.click(); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  try {
    await act(async () => { document.getElementById("clear-error")?.click(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
    expect(document.querySelector("output")?.textContent).toBe("pending");
    await act(async () => { root.render(renderProbe("reopened")); });
    expect(document.querySelector("output")?.textContent).toBe("pending");
    await act(async () => { document.getElementById("login-b")?.click(); document.getElementById("signup")?.click(); });
    expect(responses.length).toBe(1);
  } finally {
    await act(async () => { for (const respond of responses) respond(Response.json({ token: "test-token", user: { id: "a", email: "a@example.com" } })); });
  }
});
