/** Serializes disk changes and exposes pending work before its first microtask. */
export class MutationQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private count = 0;

  get pending(): boolean {
    return this.count > 0;
  }

  run<T>(operation: () => Promise<T>): Promise<T> {
    this.count += 1;
    const result = this.tail.then(operation).finally(() => {
      this.count -= 1;
    });
    // Recover the queue after a failed write, without hiding failure from caller.
    this.tail = result.catch(() => undefined);
    return result;
  }
}
