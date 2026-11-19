import { describe, expect, it } from "bun:test";
import * as releaseJobs from "../src/core/jobs/release-jobs";
import { issueProductionReminders } from "../src/core/jobs/release-jobs";

describe("release jobs", () => {
  it("does not expose the retired automatic publishing dispatchers", () => {
    for (const name of ["dispatchReleaseOutbox", "handleReleaseJob", "reconcileReleaseSchedules"])
      expect(name in releaseJobs).toBe(false);
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
