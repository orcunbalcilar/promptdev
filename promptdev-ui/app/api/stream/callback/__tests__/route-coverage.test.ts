import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/task-service", () => ({
  processAgentCallback: vi.fn(),
}));

import { POST } from "@/app/api/stream/callback/route";
import * as taskService from "@/lib/services/task-service";

describe("stream/callback route – coverage (line 10)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns task on success", async () => {
    vi.mocked(taskService.processAgentCallback).mockResolvedValue({
      id: "t1",
    } as ReturnType<typeof taskService.processAgentCallback> extends Promise<
      infer T
    >
      ? T
      : never);
    const req = new NextRequest("http://localhost/api/stream/callback", {
      method: "POST",
      body: JSON.stringify({ taskId: "t1" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 400 with Error message", async () => {
    vi.mocked(taskService.processAgentCallback).mockRejectedValue(
      new Error("bad"),
    );
    const req = new NextRequest("http://localhost/api/stream/callback", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("bad");
  });

  it("returns 400 with fallback message for non-Error (line 10)", async () => {
    vi.mocked(taskService.processAgentCallback).mockRejectedValue(
      "string error",
    );
    const req = new NextRequest("http://localhost/api/stream/callback", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Callback failed");
  });
});
