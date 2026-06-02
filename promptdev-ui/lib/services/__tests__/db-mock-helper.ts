/**
 * Test helper for mocking Drizzle ORM's chainable query builder.
 *
 * Drizzle queries are thenables (awaitable) at any point in the chain,
 * so this creates a Proxy that can be chained freely and resolves to configurable data.
 */
import { vi } from "vitest";

/**
 * Create a chainable mock that resolves to `result` when awaited.
 * Every method call returns another chainable mock with the same result.
 */
export function chainResult(result: unknown = []) {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop: string) {
      if (prop === "then") {
        return (resolve: (v: unknown) => unknown) =>
          Promise.resolve(result).then(resolve);
      }
      if (prop === "catch" || prop === "finally") {
        const p = Promise.resolve(result);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (p as any)[prop];
      }
      // Return a stable vi.fn for the same property name
      if (!target[prop]) {
        target[prop] = vi.fn(
          () => new Proxy({} as Record<string, unknown>, handler),
        );
      }
      return target[prop];
    },
  };

  return new Proxy({} as Record<string, unknown>, handler);
}

/**
 * Create a mock db object whose select/insert/update/delete
 * methods each return the given default results.
 *
 * Override per-call with mockReturnValueOnce on the returned fns:
 *   mockDb.select.mockReturnValueOnce(chainResult([newData]))
 */
export function createMockDb(defaults?: {
  selectResult?: unknown;
  insertResult?: unknown;
  updateResult?: unknown;
  deleteResult?: unknown;
}) {
  return {
    select: vi.fn(() => chainResult(defaults?.selectResult ?? [])),
    insert: vi.fn(() => chainResult(defaults?.insertResult ?? [])),
    update: vi.fn(() => chainResult(defaults?.updateResult ?? [])),
    delete: vi.fn(() => chainResult(defaults?.deleteResult ?? undefined)),
  };
}
