import type { ValidatedItem } from "../domain/review.types";
import type { AiCheckRepository, ProgressDelta } from "../domain/ai-check.repository";
import type { CheckHub } from "./check-hub";

/**
 * Why: batches finish in any order but items must get gap-free `seq` and be published only after they are in
 * the DB. One promise chain per check serialises every write; a failed write never poisons later ones.
 */
export class CheckWriter {
  private tail: Promise<void> = Promise.resolve();
  private seq = 0;

  constructor(
    private readonly checkId: string,
    private readonly repo: AiCheckRepository,
    private readonly hub: CheckHub,
  ) {}

  private enqueue(work: () => Promise<void>): Promise<void> {
    const run = this.tail.then(work);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  addBatchResult(items: ValidatedItem[], delta: ProgressDelta): Promise<void> {
    return this.enqueue(async () => {
      for (const item of items) {
        const row = await this.repo.insertItem(this.checkId, this.seq, item);
        this.seq++;
        this.hub.publish(this.checkId, { type: "item", data: row });
      }
      const check = await this.repo.addProgress(this.checkId, delta);
      if (check) {
        const { processedBlocks, totalBlocks, failedBlocks } = check;
        this.hub.publish(this.checkId, { type: "progress", data: { processedBlocks, totalBlocks, failedBlocks } });
      }
    });
  }

  /** Resolves once every queued write has settled. */
  flush(): Promise<void> {
    return this.tail;
  }
}
