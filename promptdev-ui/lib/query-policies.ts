/**
 * TanStack Query policy profiles.
 * PRD-13: Differentiated query configurations for different data freshness needs.
 */

/** For data that changes frequently and is SSE-backed (task status, events) */
export const realtimeQueryOptions = {
  staleTime: 5_000,
  gcTime: 60_000,
  retry: 2,
  refetchOnWindowFocus: true,
} as const;

/** For standard data that updates moderately (task lists, jobs) */
export const standardQueryOptions = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

/** For data that rarely changes (models, user profile, projects) */
export const stableQueryOptions = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  retry: 3,
  refetchOnWindowFocus: false,
} as const;
