/**
 * Failed-login backoff keyed by client IP + email.
 *
 * - The first FREE_FAILURES failures cost nothing extra.
 * - After that, each failure pushes the next allowed attempt out by
 *   BASE_DELAY_MS * 2^(failures - FREE_FAILURES), capped at MAX_DELAY_MS.
 * - A success clears the entry; an entry with no failure for RESET_AFTER_MS is forgotten.
 * - At most MAX_ENTRIES keys are kept; the least recently touched one is evicted first.
 *
 * Keying by IP + email means an attacker on another IP cannot lock a customer out,
 * and nothing is ever permanent. It is per process: move it to Redis before
 * running more than one API instance.
 */
export const FREE_FAILURES = 5;
export const BASE_DELAY_MS = 2_000;
export const MAX_DELAY_MS = 15 * 60 * 1000;
export const RESET_AFTER_MS = 30 * 60 * 1000;
export const MAX_ENTRIES = 10_000;

interface Entry {
  failures: number;
  nextAllowedAt: number;
  lastFailureAt: number;
}

export class LoginBackoff {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly maxEntries = MAX_ENTRIES,
  ) {}

  static key(ip: string | undefined, email: string): string {
    return `${ip ?? "unknown"}|${email}`;
  }

  /** Milliseconds the caller must still wait, or 0 when an attempt is allowed. */
  retryAfterMs(key: string): number {
    const entry = this.live(key);
    return entry ? Math.max(0, entry.nextAllowedAt - this.now()) : 0;
  }

  recordFailure(key: string): void {
    const now = this.now();
    const failures = (this.live(key)?.failures ?? 0) + 1;
    const delay =
      failures < FREE_FAILURES ? 0 : Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (failures - FREE_FAILURES));
    this.entries.delete(key); // re-insert so Map order tracks recency
    this.entries.set(key, { failures, nextAllowedAt: now + delay, lastFailureAt: now });
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value!);
    }
  }

  recordSuccess(key: string): void {
    this.entries.delete(key);
  }

  get size(): number {
    return this.entries.size;
  }

  private live(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (entry && this.now() - entry.lastFailureAt > RESET_AFTER_MS && this.now() >= entry.nextAllowedAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }
}
