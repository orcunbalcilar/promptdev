import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth guard
vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1", email: "test@example.com" } },
  }),
}));

// Mock monitoring service
vi.mock("@/lib/services/monitoring-service", () => ({
  getDashboardMetrics: vi.fn(),
}));

import { GET } from "@/app/api/monitoring/dashboard/route";
import { getDashboardMetrics } from "@/lib/services/monitoring-service";
import { requireAuth } from "@/lib/auth-guard";

const mockGetDashboard = getDashboardMetrics as ReturnType<typeof vi.fn>;
const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

function makeDashboard() {
  return {
    totalSessions: 10,
    activeSessions: 2,
    totalOperations: 50,
    totalErrors: 3,
    totalInputTokens: 5000,
    totalOutputTokens: 2000,
    operationsByType: { SEND_MESSAGE: 30 },
    sessionsByModel: { "gpt-5.2": 8 },
    sessionsBySource: { web: 9 },
    topTools: [
      { toolName: "readFile", executionCount: 15, avgDurationMs: 120 },
    ],
    dailyOperations: [{ date: "2025-01-15", count: 10 }],
    recentErrors: [],
    recentSessions: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
  mockGetDashboard.mockResolvedValue(makeDashboard());
});

describe("GET /api/monitoring/dashboard", () => {
  it("should return dashboard metrics", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/monitoring/dashboard",
    );

    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalSessions).toBe(10);
    expect(body.totalErrors).toBe(3);
    expect(body.totalInputTokens).toBe(5000);
    expect(mockGetDashboard).toHaveBeenCalledWith(7); // default
  });

  it("should pass days parameter from query string", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/monitoring/dashboard?days=30",
    );

    await GET(req);

    expect(mockGetDashboard).toHaveBeenCalledWith(30);
  });

  it("should clamp days to max 90", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/monitoring/dashboard?days=365",
    );

    await GET(req);

    expect(mockGetDashboard).toHaveBeenCalledWith(90);
  });

  it("should clamp days to min 1", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/monitoring/dashboard?days=-5",
    );

    await GET(req);

    expect(mockGetDashboard).toHaveBeenCalledWith(1); // parseInt("-5") is truthy → Math.max(-5, 1) = 1
  });

  it("should default to 7 days for invalid input", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/monitoring/dashboard?days=abc",
    );

    await GET(req);

    expect(mockGetDashboard).toHaveBeenCalledWith(7); // NaN || 7 = 7
  });

  it("should return 401 when not authenticated", async () => {
    const errorResponse = new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401 },
    );
    mockRequireAuth.mockResolvedValue({ error: errorResponse });

    const req = new NextRequest(
      "http://localhost:3000/api/monitoring/dashboard",
    );

    const response = await GET(req);

    expect(response.status).toBe(401);
    expect(mockGetDashboard).not.toHaveBeenCalled();
  });
});
