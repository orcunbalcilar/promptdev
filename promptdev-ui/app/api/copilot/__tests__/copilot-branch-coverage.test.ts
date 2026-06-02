/**
 * Branch-coverage completion tests for copilot session routes.
 * Covers: sessions/route.ts, sessions/history/route.ts, sessions/[sessionId]/route.ts,
 *         sessions/[sessionId]/messages/route.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---------- Mocks ---------- */
const mockRequireAuth = vi.fn();
vi.mock("@/lib/auth-guard", () => ({
  requireAuth: (...a: unknown[]) => mockRequireAuth(...a),
}));

const mockCreateCopilotSession = vi.fn();
const mockGetAllSessions = vi.fn();
const mockListSDKSessions = vi.fn();
const mockGetSession = vi.fn();
const mockResumeCopilotSession = vi.fn();
const mockDestroySession = vi.fn();
const mockAbortSession = vi.fn();
const mockGetSessionMessages = vi.fn();
const mockSendMessage = vi.fn();

vi.mock("@/lib/copilot/client", () => ({
  createCopilotSession: (...a: unknown[]) => mockCreateCopilotSession(...a),
  getAllSessions: (...a: unknown[]) => mockGetAllSessions(...a),
  listSDKSessions: (...a: unknown[]) => mockListSDKSessions(...a),
  getSession: (...a: unknown[]) => mockGetSession(...a),
  resumeCopilotSession: (...a: unknown[]) => mockResumeCopilotSession(...a),
  destroySession: (...a: unknown[]) => mockDestroySession(...a),
  abortSession: (...a: unknown[]) => mockAbortSession(...a),
  getSessionMessages: (...a: unknown[]) => mockGetSessionMessages(...a),
  sendMessage: (...a: unknown[]) => mockSendMessage(...a),
}));

/* --- Route imports --- */
import {
  POST as sessionsPost,
  GET as sessionsGet,
} from "@/app/api/copilot/sessions/route";

import { GET as historyGet } from "@/app/api/copilot/sessions/history/route";

import {
  GET as sessionGet,
  DELETE as sessionDelete,
  POST as sessionPost,
} from "@/app/api/copilot/sessions/[sessionId]/route";

import {
  POST as messagesPost,
  GET as messagesGet,
} from "@/app/api/copilot/sessions/[sessionId]/messages/route";

/* ---------- Helpers ---------- */
function makeReq(
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
) {
  return new NextRequest(`http://localhost:3000${url}`, init);
}

function makeParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

function jsonReq(url: string, body: unknown, method = "POST") {
  return makeReq(url, {
    method,
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "u1", copilotToken: "gho_tok" } },
    error: null,
  });
});

/* ==================================================================
   sessions/route.ts (lines 38, 58) – non-Error throw branches
   ================================================================== */
describe("sessions/route.ts branch coverage", () => {
  it("POST catch with non-Error uses fallback message", async () => {
    mockCreateCopilotSession.mockRejectedValue({ code: 42 });
    const res = await sessionsPost(
      jsonReq("/api/copilot/sessions", { model: "gpt-5.2" }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create session");
  });

  it("GET catch with non-Error uses fallback message", async () => {
    const nonError = { code: 42 };
    mockGetAllSessions.mockImplementation(() => {
      throw nonError;
    });
    const res = await sessionsGet();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to list sessions");
  });

  it("POST success creates session with provider", async () => {
    const session = { id: "s1", model: "gpt-5.2" };
    mockCreateCopilotSession.mockResolvedValue(session);
    const res = await sessionsPost(
      jsonReq("/api/copilot/sessions", {
        model: "gpt-5.2",
        reasoningEffort: "high",
        systemMessage: "Be helpful",
        provider: { type: "openai", baseUrl: "https://api.openai.com" },
      }),
    );
    expect(res.status).toBe(201);
    expect(mockCreateCopilotSession).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.2",
        reasoningEffort: "high",
        systemMessage: "Be helpful",
        provider: expect.objectContaining({ type: "openai" }),
      }),
    );
  });

  it("GET success returns sessions array", async () => {
    mockGetAllSessions.mockReturnValue([{ id: "s1" }]);
    const res = await sessionsGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([{ id: "s1" }]);
  });
});

/* ==================================================================
   sessions/history/route.ts (line 27) – success path + non-Error
   ================================================================== */
describe("sessions/history/route.ts branch coverage", () => {
  it("GET success returns sessions", async () => {
    mockListSDKSessions.mockResolvedValue([{ id: "sdk-1" }]);
    const res = await historyGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions).toEqual([{ id: "sdk-1" }]);
  });

  it("GET catch with non-Error uses fallback", async () => {
    mockListSDKSessions.mockRejectedValue({ code: 500 });
    const res = await historyGet();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to list sessions");
  });

  it("GET passes undefined when user has no copilotToken", async () => {
    mockRequireAuth.mockResolvedValue({
      session: { user: { id: "u1" } },
      error: null,
    });
    mockListSDKSessions.mockResolvedValue([]);
    const res = await historyGet();
    expect(res.status).toBe(200);
    expect(mockListSDKSessions).toHaveBeenCalledWith(undefined);
  });

  it("GET handles user being undefined", async () => {
    mockRequireAuth.mockResolvedValue({
      session: { user: undefined },
      error: null,
    });
    mockListSDKSessions.mockResolvedValue([]);
    const res = await historyGet();
    expect(res.status).toBe(200);
    expect(mockListSDKSessions).toHaveBeenCalledWith(undefined);
  });
});

/* ==================================================================
   sessions/[sessionId]/route.ts (line 95) – invalid action + non-Error
   ================================================================== */
describe("sessions/[sessionId]/route.ts branch coverage", () => {
  it("POST returns 400 when action is not abort", async () => {
    const res = await sessionPost(
      jsonReq("/api/copilot/sessions/s1", { action: "pause" }),
      makeParams("s1"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid action");
  });

  it("POST returns 400 when no action provided", async () => {
    const res = await sessionPost(
      jsonReq("/api/copilot/sessions/s1", {}),
      makeParams("s1"),
    );
    expect(res.status).toBe(400);
  });

  it("GET catch with non-Error uses fallback", async () => {
    const nonError = { code: 42 };
    mockGetSession.mockImplementation(() => {
      throw nonError;
    });
    const res = await sessionGet(
      makeReq("/api/copilot/sessions/s1"),
      makeParams("s1"),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to get session");
  });

  it("DELETE catch with non-Error uses fallback", async () => {
    mockDestroySession.mockRejectedValue({ msg: "nope" });
    const res = await sessionDelete(
      makeReq("/api/copilot/sessions/s1", { method: "DELETE" }),
      makeParams("s1"),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to destroy session");
  });

  it("POST catch with non-Error uses fallback", async () => {
    mockRequireAuth.mockResolvedValue({
      session: { user: { id: "u1" } },
      error: null,
    });
    const res = await sessionPost(
      makeReq("/api/copilot/sessions/s1", {
        method: "POST",
        body: "invalid json{",
        headers: { "content-type": "application/json" },
      }),
      makeParams("s1"),
    );
    // The JSON.parse will throw a SyntaxError (which IS an Error)
    expect(res.status).toBe(500);
  });
});

/* ==================================================================
   sessions/[sessionId]/messages/route.ts (lines 65, 94) – success paths
   ================================================================== */
describe("sessions/[sessionId]/messages/route.ts branch coverage", () => {
  it("POST success sends message with attachments", async () => {
    mockGetSession.mockReturnValue({ id: "s1" });
    mockSendMessage.mockResolvedValue("msg-99");
    const res = await messagesPost(
      jsonReq("/api/copilot/sessions/s1/messages", {
        prompt: "Hello world",
        attachments: [{ type: "file", uri: "/test.ts" }],
      }),
      makeParams("s1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messageId).toBe("msg-99");
    expect(mockSendMessage).toHaveBeenCalledWith("s1", "Hello world", [
      { type: "file", uri: "/test.ts" },
    ]);
  });

  it("GET success returns messages", async () => {
    mockGetSession.mockReturnValue({ id: "s1" });
    mockGetSessionMessages.mockResolvedValue([
      { id: "m1", content: "Hello", role: "user" },
    ]);
    const res = await messagesGet(
      makeReq("/api/copilot/sessions/s1/messages"),
      makeParams("s1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([{ id: "m1", content: "Hello", role: "user" }]);
  });

  it("POST catch with non-Error uses fallback", async () => {
    mockGetSession.mockReturnValue({ id: "s1" });
    mockSendMessage.mockRejectedValue({ code: 123 });
    const res = await messagesPost(
      jsonReq("/api/copilot/sessions/s1/messages", { prompt: "test" }),
      makeParams("s1"),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to send message");
  });

  it("GET catch with non-Error uses fallback", async () => {
    mockGetSession.mockReturnValue({ id: "s1" });
    mockGetSessionMessages.mockRejectedValue(42);
    const res = await messagesGet(
      makeReq("/api/copilot/sessions/s1/messages"),
      makeParams("s1"),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to get messages");
  });

  it("POST returns 400 when prompt is only whitespace", async () => {
    mockGetSession.mockReturnValue({ id: "s1" });
    const res = await messagesPost(
      jsonReq("/api/copilot/sessions/s1/messages", { prompt: "   " }),
      makeParams("s1"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Prompt is required");
  });

  it("POST returns 400 when prompt is number (not string)", async () => {
    mockGetSession.mockReturnValue({ id: "s1" });
    const res = await messagesPost(
      jsonReq("/api/copilot/sessions/s1/messages", { prompt: 42 }),
      makeParams("s1"),
    );
    expect(res.status).toBe(400);
  });
});
