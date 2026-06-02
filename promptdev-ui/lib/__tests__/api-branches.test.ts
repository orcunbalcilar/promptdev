/**
 * Tests for lib/api.ts — covering uncovered branches:
 * L352: filters?.status && filters.status !== "all" → query.set("status", ...)
 * L355: filters?.search → query.set("search", ...)
 * L358: filters?.workspaceType && filters.workspaceType !== "all" → query.set("workspaceType", ...)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/sse-client", () => ({
  createSseSubscription: vi.fn(() => vi.fn()),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { getTasks } from "@/lib/api";

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

const emptyPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 20,
};

describe("api – getTasks filter branches", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse(emptyPage));
  });

  it("includes status filter when not 'all' (L352)", async () => {
    await getTasks(0, 20, { status: "IN_PROGRESS" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("status=IN_PROGRESS");
  });

  it("does not include status filter when 'all' ", async () => {
    await getTasks(0, 20, { status: "all" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain("status=");
  });

  it("includes search filter (L355)", async () => {
    await getTasks(0, 20, { search: "my task" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("search=my+task");
  });

  it("includes workspaceType filter when not 'all' (L358)", async () => {
    await getTasks(0, 20, { workspaceType: "LOCAL" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("workspaceType=LOCAL");
  });

  it("does not include workspaceType filter when 'all'", async () => {
    await getTasks(0, 20, { workspaceType: "all" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain("workspaceType=");
  });

  it("includes all filters simultaneously", async () => {
    await getTasks(0, 20, {
      status: "COMPLETED",
      search: "refactor",
      workspaceType: "BITBUCKET",
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("status=COMPLETED");
    expect(url).toContain("search=refactor");
    expect(url).toContain("workspaceType=BITBUCKET");
  });

  it("works with no filters (default)", async () => {
    await getTasks(0, 20);

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("page=0");
    expect(url).toContain("size=20");
    expect(url).not.toContain("status=");
    expect(url).not.toContain("search=");
    expect(url).not.toContain("workspaceType=");
  });

  it("excludes empty search filter", async () => {
    await getTasks(0, 20, { search: "" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain("search=");
  });

  it("excludes falsy status filter", async () => {
    await getTasks(0, 20, { status: "" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain("status=");
  });
});
