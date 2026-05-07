import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1", email: "test@example.com" } },
  }),
}));

vi.mock("@/lib/services/task-service", () => ({
  getTaskEvents: vi.fn(),
}));

import { GET } from "@/app/api/tasks/[taskId]/events/route";
import { requireAuth } from "@/lib/auth-guard";
import { getTaskEvents } from "@/lib/services/task-service";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockGetTaskEvents = getTaskEvents as ReturnType<typeof vi.fn>;

function makeRouteParams(taskId: string) {
  return { params: Promise.resolve({ taskId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1", email: "test@example.com" } },
  });
});

describe("Task Events API Route", () => {
  describe("GET /api/tasks/[taskId]/events", () => {
    it("returns 401 when auth fails", async () => {
      const authError = Response.json({ error: "Unauthorized" }, { status: 401 });
      mockRequireAuth.mockResolvedValue({ error: authError });

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/events");
      const response = await GET(req, makeRouteParams("task-1"));

      expect(response.status).toBe(401);
    });

    it("returns events for the given taskId", async () => {
      const mockEvents = [
        { id: "evt-1", taskId: "task-1", type: "STATUS_CHANGE", data: { status: "IN_PROGRESS" } },
        { id: "evt-2", taskId: "task-1", type: "LOG", data: { message: "Started execution" } },
      ];
      mockGetTaskEvents.mockResolvedValue(mockEvents);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/events");
      const response = await GET(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockEvents);
      expect(mockGetTaskEvents).toHaveBeenCalledWith("task-1");
    });

    it("returns empty array when no events exist", async () => {
      mockGetTaskEvents.mockResolvedValue([]);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/events");
      const response = await GET(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });
  });
});
