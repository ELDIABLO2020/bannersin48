import { BASE_DELAY_MS, FREE_FAILURES, LoginBackoff, MAX_DELAY_MS, RESET_AFTER_MS } from "./login-backoff";

describe("LoginBackoff", () => {
  let now = 0;
  const clock = () => now;
  beforeEach(() => {
    now = 1_000_000;
  });

  it("allows the first failures freely, then doubles the wait", () => {
    const backoff = new LoginBackoff(clock);
    const key = LoginBackoff.key("1.1.1.1", "a@test.com");
    for (let i = 1; i < FREE_FAILURES; i++) {
      backoff.recordFailure(key);
      expect(backoff.retryAfterMs(key)).toBe(0);
    }
    backoff.recordFailure(key);
    expect(backoff.retryAfterMs(key)).toBe(BASE_DELAY_MS);
    backoff.recordFailure(key);
    expect(backoff.retryAfterMs(key)).toBe(BASE_DELAY_MS * 2);
    backoff.recordFailure(key);
    expect(backoff.retryAfterMs(key)).toBe(BASE_DELAY_MS * 4);

    now += BASE_DELAY_MS * 4;
    expect(backoff.retryAfterMs(key)).toBe(0);
  });

  it("caps the delay and never locks permanently", () => {
    const backoff = new LoginBackoff(clock);
    const key = LoginBackoff.key("1.1.1.1", "a@test.com");
    for (let i = 0; i < 50; i++) backoff.recordFailure(key);
    expect(backoff.retryAfterMs(key)).toBe(MAX_DELAY_MS);
    now += MAX_DELAY_MS;
    expect(backoff.retryAfterMs(key)).toBe(0);
  });

  it("isolates keys: failures from one IP do not affect another IP for the same email", () => {
    const backoff = new LoginBackoff(clock);
    const attacker = LoginBackoff.key("6.6.6.6", "victim@test.com");
    for (let i = 0; i < 20; i++) backoff.recordFailure(attacker);
    expect(backoff.retryAfterMs(attacker)).toBeGreaterThan(0);
    expect(backoff.retryAfterMs(LoginBackoff.key("7.7.7.7", "victim@test.com"))).toBe(0);
  });

  it("clears on success and forgets idle entries", () => {
    const backoff = new LoginBackoff(clock);
    const key = LoginBackoff.key("1.1.1.1", "a@test.com");
    for (let i = 0; i < FREE_FAILURES + 2; i++) backoff.recordFailure(key);
    backoff.recordSuccess(key);
    expect(backoff.retryAfterMs(key)).toBe(0);

    for (let i = 0; i < FREE_FAILURES - 1; i++) backoff.recordFailure(key);
    now += RESET_AFTER_MS + 1;
    backoff.recordFailure(key); // counts as the first failure again
    expect(backoff.retryAfterMs(key)).toBe(0);
  });

  it("is bounded: the least recently failed key is evicted past the size limit", () => {
    const backoff = new LoginBackoff(clock, 3);
    for (const ip of ["1", "2", "3"]) {
      for (let i = 0; i < FREE_FAILURES; i++) backoff.recordFailure(LoginBackoff.key(ip, "a@test.com"));
    }
    backoff.recordFailure(LoginBackoff.key("1", "a@test.com")); // touch 1 so 2 is now the oldest
    backoff.recordFailure(LoginBackoff.key("4", "a@test.com"));
    expect(backoff.size).toBe(3);
    expect(backoff.retryAfterMs(LoginBackoff.key("2", "a@test.com"))).toBe(0);
    expect(backoff.retryAfterMs(LoginBackoff.key("1", "a@test.com"))).toBeGreaterThan(0);
  });
});
