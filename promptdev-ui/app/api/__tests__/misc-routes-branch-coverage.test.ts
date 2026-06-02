/**
 * Branch-coverage completion for jira-opt-outs, scheduled-jobs run, user settings routes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---------- Auth mock ---------- */
const mockRequireAuth = vi.fn();
const mockRequireOwnership = vi.fn();
vi.mock("@/lib/auth-guard", () => ({
  requireAuth: (...a: unknown[]) => mockRequireAuth(...a),
  requireOwnership: (...a: unknown[]) => mockRequireOwnership(...a),
}));

/* ---------- Jira opt-out service mock ---------- */
const mockIsOptedOut = vi.fn();
const mockGetOptOutsForUser = vi.fn();
const mockCreateOptOut = vi.fn();
const mockDeleteOptOut = vi.fn();

vi.mock("@/lib/services/jira-opt-out-service", () => ({
  isOptedOut: (...a: unknown[]) => mockIsOptedOut(...a),
  getOptOutsForUser: (...a: unknown[]) => mockGetOptOutsForUser(...a),
  createOptOut: (...a: unknown[]) => mockCreateOptOut(...a),
  deleteOptOut: (...a: unknown[]) => mockDeleteOptOut(...a),
}));

/* ---------- Scheduled job service mock ---------- */
const mockGetJob = vi.fn();
const mockMarkJobRun = vi.fn();
vi.mock("@/lib/services/scheduled-job-service", () => ({
  getJob: (...a: unknown[]) => mockGetJob(...a),
  markJobRun: (...a: unknown[]) => mockMarkJobRun(...a),
}));

/* ---------- Task service mock ---------- */
const mockCreateTask = vi.fn();
const mockStartTask = vi.fn();
vi.mock("@/lib/services/task-service", () => ({
  createTask: (...a: unknown[]) => mockCreateTask(...a),
  startTask: (...a: unknown[]) => mockStartTask(...a),
}));

/* ---------- User service mock ---------- */
const mockUpdateSettings = vi.fn();
vi.mock("@/lib/services/user-service", () => ({
  updateSettings: (...a: unknown[]) => mockUpdateSettings(...a),
}));

/* ---------- Route imports ---------- */
import {
  GET as optOutsGet,
  POST as optOutsPost,
  DELETE as optOutsDelete,
} from "@/app/api/jira-opt-outs/route";

import { POST as runJobPost } from "@/app/api/scheduled-jobs/[id]/run/route";
import { PUT as settingsPut } from "@/app/api/users/[userId]/settings/route";

/* ---------- Helpers ---------- */
function makeReq(url: string, init?: RequestInit) {
  return new NextRequest(`http://localhost:3000${url}`, init);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "u1" } },
    error: null,
  });
});

/* ==================================================================
   jira-opt-outs/route.ts (lines 40-41) – POST/DELETE success paths
   ================================================================== */
describe("jira-opt-outs/route.ts branch coverage", () => {
  it("GET returns optOuts list for user", async () => {
    mockGetOptOutsForUser.mockResolvedValue([
      { id: "1", jiraIssueKey: "PROJ-1" },
    ]);
    const res = await optOutsGet(makeReq("/api/jira-opt-outs?userId=u1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([{ id: "1", jiraIssueKey: "PROJ-1" }]);
  });

  it("GET checking single issueKey opt-out", async () => {
    mockIsOptedOut.mockResolvedValue(true);
    const res = await optOutsGet(
      makeReq("/api/jira-opt-outs?userId=u1&issueKey=PROJ-1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.optedOut).toBe(true);
  });

  it("GET returns false for non-opted-out issue", async () => {
    mockIsOptedOut.mockResolvedValue(false);
    const res = await optOutsGet(
      makeReq("/api/jira-opt-outs?userId=u1&issueKey=PROJ-2"),
    );
    const body = await res.json();
    expect(body.optedOut).toBe(false);
  });

  it("GET requires userId", async () => {
    const res = await optOutsGet(makeReq("/api/jira-opt-outs"));
    expect(res.status).toBe(400);
  });

  it("POST creates opt-out", async () => {
    mockCreateOptOut.mockResolvedValue({ id: "1" });
    const res = await optOutsPost(
      makeReq("/api/jira-opt-outs", {
        method: "POST",
        body: JSON.stringify({
          userId: "u1",
          jiraIssueKey: "PROJ-1",
          reason: "not needed",
        }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(201);
  });

  it("DELETE removes opt-out", async () => {
    mockDeleteOptOut.mockResolvedValue(undefined);
    const res = await optOutsDelete(
      makeReq("/api/jira-opt-outs?userId=u1&issueKey=PROJ-1"),
    );
    expect(res.status).toBe(204);
  });
});

/* ==================================================================
   scheduled-jobs/[id]/run/route.ts (line 39) – non-Error branch
   ================================================================== */
describe("scheduled-jobs/[id]/run branch coverage", () => {
  it("POST catch with non-Error uses fallback", async () => {
    mockGetJob.mockRejectedValue({ code: 99 });
    const res = await runJobPost(
      makeReq("/api/scheduled-jobs/j1/run", { method: "POST" }),
      { params: Promise.resolve({ id: "j1" }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Run failed");
  });
});

/* ==================================================================
   users/[userId]/settings/route.ts (line 20) – non-Error branch
   ================================================================== */
describe("users/[userId]/settings branch coverage", () => {
  it("PUT catch with non-Error uses fallback", async () => {
    mockRequireOwnership.mockReturnValue(null);
    mockUpdateSettings.mockRejectedValue({ code: 500 });
    const res = await settingsPut(
      makeReq("/api/users/u1/settings", {
        method: "PUT",
        body: JSON.stringify({ name: "Test" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ userId: "u1" }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Update failed");
  });
});
