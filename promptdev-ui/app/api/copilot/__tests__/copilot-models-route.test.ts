import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListAvailableModels = vi.fn();

vi.mock("@/lib/copilot/client", () => ({
  listAvailableModels: (...args: unknown[]) => mockListAvailableModels(...args),
}));

import { GET } from "@/app/api/copilot/models/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/copilot/models", () => {
  it("returns dynamic models when available", async () => {
    const models = [{ id: "gpt-5.2", name: "GPT 5.2" }];
    mockListAvailableModels.mockResolvedValue(models);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.models).toEqual(models);
    expect(body.source).toBe("dynamic");
  });

  it("returns empty list when no dynamic models", async () => {
    mockListAvailableModels.mockResolvedValue([]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.models).toEqual([]);
    expect(body.source).toBe("empty");
  });

  it("returns empty list with error source on failure", async () => {
    mockListAvailableModels.mockRejectedValue(new Error("SDK error"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.models).toEqual([]);
    expect(body.source).toBe("error");
  });
});
