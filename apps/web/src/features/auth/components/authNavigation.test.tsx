import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { LandingHeader } from "@/features/landing/components/LandingHeader";
import { currentUserQueryKey } from "@/shared/services/currentUserService";
import type { CurrentUser } from "@/shared/types/auth";

describe("landing authentication controls", () => {
  it("replaces the login link with the signed-in user's profile", () => {
    const user: CurrentUser = { id: "user-1", name: "Người nghe sử", email: "user@example.com", emailVerified: true, role: "user" };
    const client = new QueryClient();
    client.setQueryData(currentUserQueryKey, user);
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><MemoryRouter><LandingHeader /></MemoryRouter></QueryClientProvider>);
    expect(html).toContain("Người nghe sử");
    expect(html).not.toContain('href="/login"');
    client.clear();
  });

  it("offers login once the session check confirms a guest", () => {
    const client = new QueryClient();
    client.setQueryData(currentUserQueryKey, null);
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><MemoryRouter><LandingHeader /></MemoryRouter></QueryClientProvider>);
    expect(html).toContain('href="/login"');
    client.clear();
  });

  it("does not flash a login link while the session is unknown", () => {
    const client = new QueryClient();
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><MemoryRouter><LandingHeader /></MemoryRouter></QueryClientProvider>);
    expect(html).not.toContain('href="/login"');
    client.clear();
  });
});
