import { describe, expect, it, spyOn } from "bun:test";
import { PgBoss } from "pg-boss";
import { issueProductionReminders, startProductionReminderJobs, stopProductionReminderJobs } from "../src/core/jobs/release-jobs";

describe("production reminder jobs", () => {
  it("retires old recurring publication jobs and registers only the reminder consumer", async () => {
    const start = spyOn(PgBoss.prototype, "start").mockImplementation(async function (this: PgBoss) { return this; });
    const stop = spyOn(PgBoss.prototype, "stop").mockResolvedValue();
    const createQueue = spyOn(PgBoss.prototype, "createQueue").mockResolvedValue();
    const schedule = spyOn(PgBoss.prototype, "schedule").mockResolvedValue();
    const unschedule = spyOn(PgBoss.prototype, "unschedule").mockResolvedValue();
    const work = spyOn(PgBoss.prototype, "work").mockResolvedValue("reminder-worker");
    const send = spyOn(PgBoss.prototype, "send").mockResolvedValue(null);
    try {
      await startProductionReminderJobs("postgresql://localhost/reminder-test", { issueDueReminders: async () => 0 });
      expect(unschedule.mock.calls.map(([name]) => name)).toEqual(["release.outbox-dispatch", "release.reconciliation"]);
      expect(createQueue.mock.calls.map(([name]) => name)).toEqual(["release.production-reminders"]);
      expect(schedule.mock.calls).toEqual([["release.production-reminders", "* * * * *"]]);
      expect(work.mock.calls.map(([name]) => name)).toEqual(["release.production-reminders"]);
      expect(send).not.toHaveBeenCalled();
      await startProductionReminderJobs("postgresql://localhost/reminder-test", { issueDueReminders: async () => 0 });
      expect(start).toHaveBeenCalledTimes(1);
      await stopProductionReminderJobs();
      expect(stop).toHaveBeenCalledTimes(1);
    } finally {
      await stopProductionReminderJobs();
      for (const method of [start, stop, createQueue, schedule, unschedule, work, send]) method.mockRestore();
    }
  });

  it("keeps reminders within the next 24 hours without publishing or reconciling schedules", async () => {
    const calls: Array<{ from: Date; to: Date }> = [];
    const forbidden = async (): Promise<never> => {
      throw new Error("Automatic publication must not run");
    };
    const repository = {
      issueDueReminders: async (from: Date, to: Date): Promise<number> => {
        calls.push({ from, to });
        return 2;
      },
      listPendingOutbox: forbidden,
      listDueScheduleIds: forbidden,
      listStuckPublishingIds: forbidden,
      claimForPublishing: forbidden,
      setStatus: forbidden,
    };
    const now = new Date("2026-10-18T13:00:00.000Z");
    await issueProductionReminders(repository, now);
    expect(calls).toEqual([{
      from: now,
      to: new Date("2026-10-19T13:00:00.000Z"),
    }]);
  });

  it("propagates reminder failures to the queue without invoking a publisher", async () => {
    await expect(issueProductionReminders({
      issueDueReminders: async () => { throw new Error("reminders unavailable"); },
    })).rejects.toThrow("reminders unavailable");
  });
});
