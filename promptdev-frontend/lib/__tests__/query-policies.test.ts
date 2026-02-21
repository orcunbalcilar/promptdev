import { describe, it, expect } from "vitest";
import {
  realtimeQueryOptions,
  standardQueryOptions,
  stableQueryOptions,
} from "../query-policies";

describe("query-policies", () => {
  describe("realtimeQueryOptions", () => {
    it("has short staleTime for frequently changing data", () => {
      expect(realtimeQueryOptions.staleTime).toBe(5_000);
    });

    it("has short gcTime", () => {
      expect(realtimeQueryOptions.gcTime).toBe(60_000);
    });

    it("retries twice", () => {
      expect(realtimeQueryOptions.retry).toBe(2);
    });

    it("refetches on window focus", () => {
      expect(realtimeQueryOptions.refetchOnWindowFocus).toBe(true);
    });
  });

  describe("standardQueryOptions", () => {
    it("has moderate staleTime", () => {
      expect(standardQueryOptions.staleTime).toBe(30_000);
    });

    it("has 5 minute gcTime", () => {
      expect(standardQueryOptions.gcTime).toBe(5 * 60_000);
    });

    it("retries once", () => {
      expect(standardQueryOptions.retry).toBe(1);
    });

    it("does not refetch on window focus", () => {
      expect(standardQueryOptions.refetchOnWindowFocus).toBe(false);
    });
  });

  describe("stableQueryOptions", () => {
    it("has long staleTime for rarely changing data", () => {
      expect(stableQueryOptions.staleTime).toBe(5 * 60_000);
    });

    it("has 30 minute gcTime", () => {
      expect(stableQueryOptions.gcTime).toBe(30 * 60_000);
    });

    it("retries 3 times for resilience", () => {
      expect(stableQueryOptions.retry).toBe(3);
    });

    it("does not refetch on window focus", () => {
      expect(stableQueryOptions.refetchOnWindowFocus).toBe(false);
    });
  });

  it("staleTime increases across tiers: realtime < standard < stable", () => {
    expect(realtimeQueryOptions.staleTime).toBeLessThan(standardQueryOptions.staleTime);
    expect(standardQueryOptions.staleTime).toBeLessThan(stableQueryOptions.staleTime);
  });

  it("gcTime increases across tiers: realtime < standard < stable", () => {
    expect(realtimeQueryOptions.gcTime).toBeLessThan(standardQueryOptions.gcTime);
    expect(standardQueryOptions.gcTime).toBeLessThan(stableQueryOptions.gcTime);
  });
});
