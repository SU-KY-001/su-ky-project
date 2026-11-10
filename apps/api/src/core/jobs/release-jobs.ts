import { PgBoss } from "pg-boss";
import { logger } from "../logger";
import type { ReleaseRepository } from "../../modules/releases/domain/release.repository";

const REMINDER_QUEUE = "release.production-reminders";
const EVERY_MINUTE = "* * * * *";

export async function issueProductionReminders(
  repository: Pick<ReleaseRepository, "issueDueReminders">,
  now = new Date(),
): Promise<void> {
  await repository.issueDueReminders(
    now,
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
  );
}

let reminderBoss: PgBoss | null = null;

export async function startProductionReminderJobs(
  connectionString: string,
  repository: Pick<ReleaseRepository, "issueDueReminders">,
): Promise<void> {
  if (reminderBoss) return;
  const boss = new PgBoss({ connectionString });
  boss.on("error", (error: Error) =>
    logger.error({ err: error }, "Production reminder queue error"),
  );
  try {
    await boss.start();
    // Retire recurring jobs persisted by older releases. No publication queue is consumed.
    await boss.unschedule("release.outbox-dispatch");
    await boss.unschedule("release.reconciliation");
    await boss.createQueue(REMINDER_QUEUE);
    await boss.schedule(REMINDER_QUEUE, EVERY_MINUTE);
    await boss.work(REMINDER_QUEUE, async () => {
      await issueProductionReminders(repository);
    });
    reminderBoss = boss;
  } catch (error) {
    await boss.stop({ graceful: true, timeout: 30_000 });
    throw error;
  }
}

export async function stopProductionReminderJobs(): Promise<void> {
  const boss = reminderBoss;
  reminderBoss = null;
  if (boss) await boss.stop({ graceful: true, timeout: 30_000 });
}
