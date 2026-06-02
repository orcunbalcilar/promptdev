import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
  }),
}));

vi.mock("@/lib/services/jira-opt-out-service", () => ({
  isOptedOut: vi.fn(),
  getOptOutsForUser: vi.fn(),
  createOptOut: vi.fn(),
  deleteOptOut: vi.fn(),
}));

import { GET, POST, DELETE } from "@/app/api/jira-opt-outs/route";
import { requireAuth } from "@/lib/auth-guard";
import {
  isOptedOut,
  getOptOutsForUser,
  createOptOut,
  deleteOptOut,
} from "@/lib/services/jira-opt-out-service";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockIsOptedOut = isOptedOut as ReturnType<typeof vi.fn>;
const mockGetOptOuts = getOptOutsForUser as ReturnType<typeof vi.fn>;
const mockCreateOptOut = createOptOut as ReturnType<typeof vi.fn>;
const mockDeleteOptOut = deleteOptOut as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
});

// ─── GET ───────────────────────────────────────────────────

describe("GET /api/jira-opt-outs", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest(
      "http://localhost:3000/api/jira-opt-outs?userId=u1",
    );
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("returns 400 when userId is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/jira-opt-outs");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("userId required");
  });

  it("checks single opt-out when issueKey is provided", async () => {
    mockIsOptedOut.mockResolvedValue(true);

    const req = new NextRequest(
      "http://localhost:3000/api/jira-opt-outs?userId=u1&issueKey=PROJ-123",
    );

    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ optedOut: true });
    expect(mockIsOptedOut).toHaveBeenCalledWith("u1", "PROJ-123");
  });

  it("returns all opt-outs for user when only userId is provided", async () => {
    const optOuts = [
      { userId: "u1", jiraIssueKey: "PROJ-1" },
      { userId: "u1", jiraIssueKey: "PROJ-2" },
    ];
    mockGetOptOuts.mockResolvedValue(optOuts);

    const req = new NextRequest(
      "http://localhost:3000/api/jira-opt-outs?userId=u1",
    );

    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(optOuts);
    expect(mockGetOptOuts).toHaveBeenCalledWith("u1");
  });
});

// ─── POST ──────────────────────────────────────────────────

describe("POST /api/jira-opt-outs", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost:3000/api/jira-opt-outs", {
      method: "POST",
      body: JSON.stringify({ userId: "u1", jiraIssueKey: "PROJ-1" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("creates an opt-out and returns 201", async () => {
    const optOut = {
      userId: "u1",
      jiraIssueKey: "PROJ-1",
      reason: "not relevant",
    };
    mockCreateOptOut.mockResolvedValue(optOut);

    const req = new NextRequest("http://localhost:3000/api/jira-opt-outs", {
      method: "POST",
      body: JSON.stringify({
        userId: "u1",
        jiraIssueKey: "PROJ-1",
        reason: "not relevant",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(optOut);
    expect(mockCreateOptOut).toHaveBeenCalledWith(
      "u1",
      "PROJ-1",
      "not relevant",
    );
  });
});

// ─── DELETE ────────────────────────────────────────────────

describe("DELETE /api/jira-opt-outs", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest(
      "http://localhost:3000/api/jira-opt-outs?userId=u1&issueKey=PROJ-1",
      { method: "DELETE" },
    );
    const res = await DELETE(req);

    expect(res.status).toBe(401);
  });

  it("deletes the opt-out and returns 204", async () => {
    mockDeleteOptOut.mockResolvedValue(undefined);

    const req = new NextRequest(
      "http://localhost:3000/api/jira-opt-outs?userId=u1&issueKey=PROJ-1",
      { method: "DELETE" },
    );

    const res = await DELETE(req);

    expect(res.status).toBe(204);
    expect(mockDeleteOptOut).toHaveBeenCalledWith("u1", "PROJ-1");
  });
});
