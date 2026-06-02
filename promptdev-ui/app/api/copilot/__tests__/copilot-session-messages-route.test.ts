import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
  }),
}));

const mockGetSession = vi.fn();
const mockGetSessionMessages = vi.fn();
const mockSendMessage = vi.fn();

vi.mock("@/lib/copilot/client", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
  getSessionMessages: (...args: unknown[]) => mockGetSessionMessages(...args),
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));

import {
  POST,
  GET,
} from "@/app/api/copilot/sessions/[sessionId]/messages/route";
import { requireAuth } from "@/lib/auth-guard";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

function makeParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

function makeRequest(
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
) {
  return new NextRequest(`http://localhost:3000${url}`, init);
}

const authError = new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401,
  headers: { "content-type": "application/json" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
});

describe("POST /api/copilot/sessions/[sessionId]/messages", () => {
  it("sends a message successfully", async () => {
    mockGetSession.mockReturnValue({ id: "s-1" });
    mockSendMessage.mockResolvedValue("msg-1");

    const req = makeRequest("/api/copilot/sessions/s-1/messages", {
      method: "POST",
      body: JSON.stringify({ prompt: "Hello" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, makeParams("s-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.messageId).toBe("msg-1");
    expect(mockSendMessage).toHaveBeenCalledWith("s-1", "Hello", undefined);
  });

  it("returns 404 when session not found", async () => {
    mockGetSession.mockReturnValue(undefined);

    const req = makeRequest("/api/copilot/sessions/s-1/messages", {
      method: "POST",
      body: JSON.stringify({ prompt: "Hello" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, makeParams("s-1"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });

  it("returns 400 when prompt is empty", async () => {
    mockGetSession.mockReturnValue({ id: "s-1" });

    const req = makeRequest("/api/copilot/sessions/s-1/messages", {
      method: "POST",
      body: JSON.stringify({ prompt: "" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, makeParams("s-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Prompt is required");
  });

  it("returns 400 when prompt is missing", async () => {
    mockGetSession.mockReturnValue({ id: "s-1" });

    const req = makeRequest("/api/copilot/sessions/s-1/messages", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, makeParams("s-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Prompt is required");
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/copilot/sessions/s-1/messages", {
      method: "POST",
      body: JSON.stringify({ prompt: "Hello" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, makeParams("s-1"));

    expect(res.status).toBe(401);
  });

  it("returns 500 on sendMessage error", async () => {
    mockGetSession.mockReturnValue({ id: "s-1" });
    mockSendMessage.mockRejectedValue(new Error("Send failed"));

    const req = makeRequest("/api/copilot/sessions/s-1/messages", {
      method: "POST",
      body: JSON.stringify({ prompt: "Hello" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, makeParams("s-1"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Send failed");
  });

  it("trims prompt whitespace", async () => {
    mockGetSession.mockReturnValue({ id: "s-1" });
    mockSendMessage.mockResolvedValue("msg-1");

    const req = makeRequest("/api/copilot/sessions/s-1/messages", {
      method: "POST",
      body: JSON.stringify({ prompt: "  Hello  " }),
      headers: { "content-type": "application/json" },
    });
    await POST(req, makeParams("s-1"));

    expect(mockSendMessage).toHaveBeenCalledWith("s-1", "Hello", undefined);
  });

  it("passes attachments to sendMessage", async () => {
    mockGetSession.mockReturnValue({ id: "s-1" });
    mockSendMessage.mockResolvedValue("msg-1");
    const attachments = [{ name: "file.txt", content: "data" }];

    const req = makeRequest("/api/copilot/sessions/s-1/messages", {
      method: "POST",
      body: JSON.stringify({ prompt: "Hello", attachments }),
      headers: { "content-type": "application/json" },
    });
    await POST(req, makeParams("s-1"));

    expect(mockSendMessage).toHaveBeenCalledWith("s-1", "Hello", attachments);
  });
});

describe("GET /api/copilot/sessions/[sessionId]/messages", () => {
  it("returns message history", async () => {
    mockGetSession.mockReturnValue({ id: "s-1" });
    const messages = [{ id: "m-1", content: "Hi" }];
    mockGetSessionMessages.mockResolvedValue(messages);

    const req = makeRequest("/api/copilot/sessions/s-1/messages");
    const res = await GET(req, makeParams("s-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(messages);
  });

  it("returns 404 when session not found", async () => {
    mockGetSession.mockReturnValue(undefined);

    const req = makeRequest("/api/copilot/sessions/s-1/messages");
    const res = await GET(req, makeParams("s-1"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/copilot/sessions/s-1/messages");
    const res = await GET(req, makeParams("s-1"));

    expect(res.status).toBe(401);
  });

  it("returns 500 on getSessionMessages error", async () => {
    mockGetSession.mockReturnValue({ id: "s-1" });
    mockGetSessionMessages.mockRejectedValue(new Error("Fetch failed"));

    const req = makeRequest("/api/copilot/sessions/s-1/messages");
    const res = await GET(req, makeParams("s-1"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Fetch failed");
  });
});
