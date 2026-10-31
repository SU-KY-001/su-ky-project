import { describe, expect, it } from "bun:test";
import {
  dispatchReleaseOutbox,
  handleReleaseJob,
  reconcileReleaseSchedules,
  type ReleaseJobQueue,
} from "../src/core/jobs/release-jobs";

class FakeQueue implements ReleaseJobQueue {
  sent: Array<{ name: string; data: unknown; options: Record<string, unknown> }> = [];
  fail = false;

  async send(
    name: string,
    data: unknown,
    options: Record<string, unknown> = {},
  ): Promise<string | null> {
    if (this.fail) throw new Error("queue unavailable");
    this.sent.push({ name, data, options });
    return `job-${this.sent.length}`;
  }
}

describe("release jobs", () => {
  it("dispatches an outbox event as a versioned delayed job", async () => {
    const queue = new FakeQueue();
    const dispatched: string[] = [];
    const repository = {
      listPendingOutbox: async () => [{
        id: "outbox-1",
        eventType: "release.schedule.created",
        aggregateType: "release_schedule",
        aggregateId: "schedule-1",
        payload: {
          scheduleId: "schedule-1",
          scheduleVersion: 4,
          scheduledAt: "2026-10-20T13:00:00.000Z",
        },
        attempts: 0,
        createdAt: new Date("2026-10-15T00:00:00.000Z"),
      }],
      markOutboxDispatched: async (id: string) => { dispatched.push(id); },
      markOutboxFailed: async () => {},
    };

    await dispatchReleaseOutbox(repository, queue, new Date("2026-10-15T00:00:00.000Z"));

    expect(queue.sent).toHaveLength(1);
    expect(queue.sent[0]).toMatchObject({
      name: "podcast.release",
      data: { scheduleId: "schedule-1", scheduleVersion: 4, attempt: 1 },
      options: {
        singletonKey: "release:schedule-1:4",
        startAfter: new Date("2026-10-20T13:00:00.000Z"),
      },
    });
    expect(dispatched).toEqual(["outbox-1"]);
  });

  it("keeps a failed outbox event pending for reconciliation", async () => {
    const queue = new FakeQueue();
    queue.fail = true;
    const failures: Array<{ id: string; error: string }> = [];
    const repository = {
      listPendingOutbox: async () => [{
        id: "outbox-2",
        eventType: "release.schedule.rescheduled",
        aggregateType: "release_schedule",
        aggregateId: "schedule-2",
        payload: {
          scheduleId: "schedule-2",
          scheduleVersion: 2,
          scheduledAt: "2026-10-21T13:00:00.000Z",
        },
        attempts: 1,
        createdAt: new Date(),
      }],
      markOutboxDispatched: async () => {},
      markOutboxFailed: async (id: string, error: string) => {
        failures.push({ id, error });
      },
    };
    await dispatchReleaseOutbox(repository, queue, new Date());
    expect(failures[0]).toMatchObject({ id: "outbox-2", error: "queue unavailable" });
  });

  it("treats a blocked business result as a completed job", async () => {
    const calls: unknown[][] = [];
    const service = {
      publishDueSchedule: async (...args: unknown[]) => {
        calls.push(args);
        return "BLOCKED" as const;
      },
    };
    const queue = new FakeQueue();
    await expect(handleReleaseJob(service, queue, {
      id: "job-1",
      data: {
        scheduleId: "schedule-1",
        scheduleVersion: 1,
        correlationId: "correlation-1",
        attempt: 1,
      },
    }, new Date())).resolves.toBe("BLOCKED");
    expect(calls).toHaveLength(1);
    expect(queue.sent).toHaveLength(0);
  });

  it("schedules technical retries after 1, 5 and 15 minutes", async () => {
    const queue = new FakeQueue();
    const service = { publishDueSchedule: async () => "RETRY" as const };
    const clock = new Date("2026-10-20T13:00:00.000Z");
    for (const attempt of [1, 2, 3]) {
      await handleReleaseJob(service, queue, {
        id: `job-${attempt}`,
        data: {
          scheduleId: "schedule-1",
          scheduleVersion: 1,
          correlationId: "correlation-1",
          attempt,
        },
      }, clock);
    }
    expect(queue.sent.map((item) => (item.options.startAfter as Date).toISOString())).toEqual([
      "2026-10-20T13:01:00.000Z",
      "2026-10-20T13:05:00.000Z",
      "2026-10-20T13:15:00.000Z",
    ]);
  });

  it("reconciles due schedules that may have lost their delayed job", async () => {
    const queue = new FakeQueue();
    const repository = {
      issueDueReminders: async () => 0,
      listDueScheduleIds: async () => [{ id: "schedule-3", version: 7 }],
      listStuckPublishingIds: async () => [],
      findSchedule: async () => null,
      setStatus: async () => false,
    };
    await reconcileReleaseSchedules(
      repository,
      queue,
      new Date("2026-10-20T13:00:00.000Z"),
    );
    expect(queue.sent[0]).toMatchObject({
      name: "podcast.release",
      data: { scheduleId: "schedule-3", scheduleVersion: 7, attempt: 1 },
    });
  });

  it("issues idempotent production reminders 24 hours before the deadline", async () => {
    const queue = new FakeQueue();
    const calls: Array<{ from: Date; to: Date }> = [];
    const repository = {
      issueDueReminders: async (from: Date, to: Date) => {
        calls.push({ from, to });
        return 2;
      },
      listDueScheduleIds: async () => [],
      listStuckPublishingIds: async () => [],
      findSchedule: async () => null,
      setStatus: async () => false,
    };
    const now = new Date("2026-10-18T13:00:00.000Z");
    await reconcileReleaseSchedules(repository, queue, now);
    expect(calls).toEqual([{ from: now, to: new Date("2026-10-19T13:00:00.000Z") }]);
  });
});
