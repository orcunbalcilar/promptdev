// lib/__tests__/api-coverage.test.ts
// Covers: CSRF token extraction (line ~23 of apiFetch), scheduled job functions
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/sse-client", () => ({
  createSseSubscription: vi.fn(() => vi.fn()),
}));

import {
  createScheduledJob,
  getScheduledJob,
  getScheduledJobs,
  deleteScheduledJob,
  createTask,
} from "@/lib/api";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function emptyResponse(status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    text: () => Promise.resolve(""),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  // Clear the cookie by expiring it
  document.cookie =
    "next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
});

describe("apiFetch – CSRF token extraction (line 23)", () => {
  it("includes x-csrf-token header for POST when csrf cookie exists", async () => {
    document.cookie = "next-auth.csrf-token=testtoken123|somehash";
    mockFetch.mockResolvedValue(jsonResponse({ id: "task-1" }));

    await createTask({
      title: "Test",
      prompt: "Do something",
      repositorySlug: "repo",
    });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["x-csrf-token"]).toBe("testtoken123");
  });

  it("extracts csrf token correctly when multiple cookies exist", async () => {
    document.cookie = "session=abc123";
    document.cookie = "next-auth.csrf-token=multitoken789|longhash";
    document.cookie = "other=val";
    mockFetch.mockResolvedValue(jsonResponse({ id: "job-1" }));

    await createScheduledJob({
      name: "Test Job",
      cronExpression: "0 0 * * *",
      promptTemplate: "Do stuff",
      workspaceRef: "my-repo",
    });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["x-csrf-token"]).toBe("multitoken789");
  });

  it("does not include x-csrf-token when cookie is absent", async () => {
    // Ensure no csrf cookie exists
    document.cookie =
      "next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie =
      "__Host-next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    mockFetch.mockResolvedValue(jsonResponse({ id: "job-1" }));

    await createScheduledJob({
      name: "Test Job",
      cronExpression: "0 0 * * *",
      promptTemplate: "Do stuff",
      workspaceRef: "repo",
    });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["x-csrf-token"]).toBeUndefined();
  });

  it("does not include x-csrf-token for GET requests", async () => {
    document.cookie = "next-auth.csrf-token=testtoken123|hash";
    mockFetch.mockResolvedValue(jsonResponse([]));

    await getScheduledJobs();

    const [, opts] = mockFetch.mock.calls[0];
    // GET requests don't pass method in options, so apiFetch won't add CSRF
    expect(opts.headers["x-csrf-token"]).toBeUndefined();
  });
});

describe("Scheduled Job API functions (lines 433-450, 484)", () => {
  it("createScheduledJob POSTs to /scheduled-jobs", async () => {
    const job = { id: "job-1", name: "Test" };
    mockFetch.mockResolvedValue(jsonResponse(job));

    const result = await createScheduledJob({
      name: "Test",
      cronExpression: "0 0 * * *",
      promptTemplate: "Run tests",
      workspaceRef: "my-repo",
    });

    expect(mockFetch.mock.calls[0][0]).toBe("/api/scheduled-jobs");
    expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    expect(result).toEqual(job);
  });

  it("getScheduledJob GETs /scheduled-jobs/:id", async () => {
    const job = { id: "job-1", name: "Weekly" };
    mockFetch.mockResolvedValue(jsonResponse(job));

    const result = await getScheduledJob("job-1");

    expect(mockFetch.mock.calls[0][0]).toBe("/api/scheduled-jobs/job-1");
    expect(result).toEqual(job);
  });

  it("getScheduledJobs GETs /scheduled-jobs", async () => {
    mockFetch.mockResolvedValue(jsonResponse([{ id: "j1" }]));

    const result = await getScheduledJobs();

    expect(mockFetch.mock.calls[0][0]).toBe("/api/scheduled-jobs");
    expect(result).toHaveLength(1);
  });

  it("getScheduledJobs GETs /scheduled-jobs?type=... when type provided", async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));

    await getScheduledJobs("MAINTENANCE");

    expect(mockFetch.mock.calls[0][0]).toBe(
      "/api/scheduled-jobs?type=MAINTENANCE",
    );
  });

  it("deleteScheduledJob DELETEs /scheduled-jobs/:id", async () => {
    mockFetch.mockResolvedValue(emptyResponse());

    await deleteScheduledJob("job-99");

    expect(mockFetch.mock.calls[0][0]).toBe("/api/scheduled-jobs/job-99");
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
  });
});
