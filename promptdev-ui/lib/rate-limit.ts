/**
 * In-memory rate limiting utility for API route handlers.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export class RateLimiter {
  private entries = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || now >= entry.resetAt) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + this.config.windowMs,
      };
      this.entries.set(key, newEntry);
      return {
        allowed: true,
        remaining: this.config.limit - 1,
        resetAt: newEntry.resetAt,
      };
    }

    entry.count++;
    const allowed = entry.count <= this.config.limit;
    return {
      allowed,
      remaining: Math.max(0, this.config.limit - entry.count),
      resetAt: entry.resetAt,
    };
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  /** Clean up expired entries to prevent memory leaks */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now >= entry.resetAt) {
        this.entries.delete(key);
      }
    }
  }
}

/** Default rate limiter: 100 requests per minute */
export const defaultRateLimiter = new RateLimiter({
  limit: 100,
  windowMs: 60_000,
});

/** Stricter rate limiter for write operations: 20 per minute */
export const writeRateLimiter = new RateLimiter({
  limit: 20,
  windowMs: 60_000,
});
