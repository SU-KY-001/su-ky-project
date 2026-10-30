/**
 * Why: a global cap on simultaneous model sessions, so one busy hour cannot exhaust the provider's rate limit
 * for everyone (bulkhead). FIFO; a released slot is handed straight to the next waiter.
 */
export class ModelGate {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) await new Promise<void>((resolve) => this.waiters.push(resolve));
    else this.active++;
    try {
      return await work();
    } finally {
      const next = this.waiters.shift();
      if (next) next();
      else this.active--;
    }
  }
}
