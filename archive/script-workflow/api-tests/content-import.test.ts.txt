import { afterAll, afterEach, beforeAll, describe, expect, it, mock } from "bun:test";
import * as dbModule from "@repo/db";
import { DomainError } from "../src/core/errors/domain-error";
import type { Session } from "../src/modules/auth";
import { ContentImportService } from "../src/modules/script-workflow/application/content-import.service";

const RUN_ID = 7;
const NOW = new Date("2026-10-09T00:00:00.000Z");

const session: Session = {
  user: {
    id: "moderator-1",
    name: "Moderator",
    email: "moderator@example.com",
    emailVerified: true,
    image: null,
    role: "moderator",
    banned: false,
    banReason: null,
    banExpires: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  session: {
    id: "session-1",
    userId: "moderator-1",
    token: "token-1",
    expiresAt: new Date(NOW.getTime() + 60_000),
    createdAt: NOW,
    updatedAt: NOW,
  },
};

const importRequest = {
  basis: { factCheckerVersionId: 21 },
  sourceDecisions: [],
  entityDecisions: [],
};

// Snapshot of the real module so the process-wide mock can be undone for sibling test files.
const realDb = { ...dbModule };

interface FactCheckerStepRow {
  id: number;
  status: "WAITING_FOR_HUMAN" | "COMPLETED";
  currentVersion: number;
  approvedVersion: number | null;
}

const runRow = { id: RUN_ID, createdById: session.user.id, seriesId: null };
let factCheckerStep: FactCheckerStepRow | null = null;

function installDbMock() {
  mock.module("@repo/db", () => ({
    ...realDb,
    prisma: {
      workflowRun: { findFirst: () => Promise.resolve(runRow) },
      auditLog: { findFirst: () => Promise.resolve(null) },
      workflowStep: { findUnique: () => Promise.resolve(factCheckerStep) },
    },
  }));
}

async function expectNotAvailable(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(DomainError);
  if (error instanceof DomainError) {
    expect(error.status).toBe(409);
    expect(error.code).toBe("IMPORT_NOT_AVAILABLE");
  }
}

describe("ContentImportService Gate 2 gating", () => {
  beforeAll(installDbMock);
  afterAll(() => {
    mock.module("@repo/db", () => realDb);
  });
  afterEach(() => {
    factCheckerStep = null;
  });

  it("returns 409 IMPORT_NOT_AVAILABLE for preview while the fact-checker waits for Gate 2", async () => {
    factCheckerStep = { id: 3, status: "WAITING_FOR_HUMAN", currentVersion: 1, approvedVersion: null };
    await expectNotAvailable(new ContentImportService().preview(RUN_ID, session));
  });

  it("returns 409 IMPORT_NOT_AVAILABLE for import and never auto-approves Gate 2", async () => {
    factCheckerStep = { id: 3, status: "WAITING_FOR_HUMAN", currentVersion: 1, approvedVersion: null };
    await expectNotAvailable(new ContentImportService().import(RUN_ID, session, importRequest));
  });

  it("returns 409 IMPORT_NOT_AVAILABLE when the fact-checker step does not exist yet", async () => {
    await expectNotAvailable(new ContentImportService().preview(RUN_ID, session));
  });
});
