/**
 * Coverage completion for reviews-tab.tsx (line 150), copilot session route (line 95),
 * jira-opt-outs route (lines 40-41), and various small branch gaps.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ── Auth mock ── */
const mockRequireAuth = vi.fn();
vi.mock("@/lib/auth-guard", () => ({
  requireAuth: (...a: unknown[]) => mockRequireAuth(...a),
}));

/* ── Copilot session service mock ── */
const mockAbortSession = vi.fn();
vi.mock("@/lib/copilot/orchestrator/session-lifecycle", () => ({
  abortSession: (...a: unknown[]) => mockAbortSession(...a),
}));

/* ── Jira opt-out service mock ── */
const mockDeleteOptOut = vi.fn();
vi.mock("@/lib/services/jira-opt-out-service", () => ({
  deleteOptOut: (...a: unknown[]) => mockDeleteOptOut(...a),
  isOptedOut: vi.fn(),
  getOptOutsForUser: vi.fn(),
  createOptOut: vi.fn(),
}));

import { POST as sessionIdPost } from "@/app/api/copilot/sessions/[sessionId]/route";
import { DELETE as optOutsDelete } from "@/app/api/jira-opt-outs/route";

function makeReq(
  url: string,
  init?: ConstructorParameters<typeof NextRequest>[1],
) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "u1" } },
    error: null,
  });
});

describe("copilot/sessions/[sessionId]/route.ts – invalid action (line 95)", () => {
  it("returns 400 for invalid action", async () => {
    const res = await sessionIdPost(
      makeReq("/api/copilot/sessions/s1", {
        method: "POST",
        body: JSON.stringify({ action: "invalid" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ sessionId: "s1" }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid action");
  });
});

describe("jira-opt-outs DELETE without query params (lines 40-41 ?? fallback)", () => {
  it("DELETE with no userId/issueKey uses empty string fallback", async () => {
    mockDeleteOptOut.mockResolvedValue(undefined);
    const res = await optOutsDelete(makeReq("/api/jira-opt-outs"));
    expect(res.status).toBe(204);
    expect(mockDeleteOptOut).toHaveBeenCalledWith("", "");
  });
});
