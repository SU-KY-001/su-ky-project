import { afterEach, expect, it, spyOn } from "bun:test";
import { app } from "../src/app";
import { auth, type Session } from "../src/modules/auth";

let restore: (() => void) | undefined;
afterEach(() => {
  restore?.();
  restore = undefined;
});

it("requires authentication before accepting an import document", async () => {
  const session = spyOn(auth.api, "getSession").mockResolvedValue(null);
  restore = () => session.mockRestore();
  const response = await app.request("/api/studio/quiz-import/extract", {
    method: "POST",
  });
  expect(response.status).toBe(401);
});

it("does not allow a listener to upload quiz source documents", async () => {
  const now = new Date();
  const listener: Session = {
    user: {
      id: "import-listener",
      name: "Listener",
      email: "listener@example.com",
      emailVerified: true,
      image: null,
      role: "user",
      banned: false,
      banReason: null,
      banExpires: null,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: "import-session",
      userId: "import-listener",
      token: "test-token",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: now,
      updatedAt: now,
    },
  };
  const session = spyOn(auth.api, "getSession").mockResolvedValue(listener);
  restore = () => session.mockRestore();
  const response = await app.request("/api/studio/quiz-import/extract", {
    method: "POST",
  });
  expect(response.status).toBe(403);
});

it("keeps document imports moderator-only even for an administrator", async () => {
  const { makeSession } = await import("./support/integration");
  const session = spyOn(auth.api, "getSession").mockResolvedValue(
    makeSession("import-admin", "admin"),
  );
  restore = () => session.mockRestore();
  const response = await app.request("/api/studio/quiz-import/extract", {
    method: "POST",
  });
  expect(response.status).toBe(403);
});
