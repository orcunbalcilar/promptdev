import { RateLimiter } from "@/lib/rate-limit";

describe("RateLimiter", () => {
  it("should allow requests within limit", () => {
    const limiter = new RateLimiter({ limit: 3, windowMs: 60000 });
    const r1 = limiter.check("user1");
    const r2 = limiter.check("user1");
    const r3 = limiter.check("user1");
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
  });

  it("should block requests exceeding limit", () => {
    const limiter = new RateLimiter({ limit: 2, windowMs: 60000 });
    limiter.check("user1");
    limiter.check("user1");
    const r3 = limiter.check("user1");
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("should track remaining requests", () => {
    const limiter = new RateLimiter({ limit: 5, windowMs: 60000 });
    expect(limiter.check("user1").remaining).toBe(4);
    expect(limiter.check("user1").remaining).toBe(3);
    expect(limiter.check("user1").remaining).toBe(2);
  });

  it("should track separate keys independently", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 60000 });
    expect(limiter.check("user1").allowed).toBe(true);
    expect(limiter.check("user2").allowed).toBe(true);
    expect(limiter.check("user1").allowed).toBe(false);
  });

  it("should reset a specific key", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 60000 });
    limiter.check("user1");
    expect(limiter.check("user1").allowed).toBe(false);
    limiter.reset("user1");
    expect(limiter.check("user1").allowed).toBe(true);
  });

  it("should allow requests after window expires", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 100 });
    limiter.check("user1");
    expect(limiter.check("user1").allowed).toBe(false);

    // Simulate time passing by manipulating the entry
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 200);
    expect(limiter.check("user1").allowed).toBe(true);
    vi.restoreAllMocks();
  });

  it("should clean up expired entries", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 100 });
    limiter.check("user1");
    limiter.check("user2");

    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 200);
    limiter.cleanup();
    // After cleanup, entries should be removed, so new requests should be allowed
    expect(limiter.check("user1").allowed).toBe(true);
    vi.restoreAllMocks();
  });
});
