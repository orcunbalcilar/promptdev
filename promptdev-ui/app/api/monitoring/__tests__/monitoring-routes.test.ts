import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
  }),
}));

vi.mock("@/lib/services/monitoring-service", () => ({
  getOperations: vi.fn(),
  createOperation: vi.fn(),
  batchCreateOperations: vi.fn(),
  getSessions: vi.fn(),
  createSession: vi.fn(),
  endSession: vi.fn(),
  getSessionDetails: vi.fn(),
  getSessionOperations: vi.fn(),
}));

import * as monitoringService from "@/lib/services/monitoring-service";
import { requireAuth } from "@/lib/auth-guard";

import {
  GET as operationsGET,
  POST as operationsPOST,
} from "@/app/api/monitoring/operations/route";
import { POST as batchPOST } from "@/app/api/monitoring/operations/batch/route";
import {
  GET as sessionsGET,
  POST as sessionsPOST,
} from "@/app/api/monitoring/sessions/route";
import { DELETE as sessionDELETE } from "@/app/api/monitoring/sessions/[sessionId]/route";
import { GET as sessionDetailsGET } from "@/app/api/monitoring/sessions/[sessionId]/details/route";
import { GET as sessionOperationsGET } from "@/app/api/monitoring/sessions/[sessionId]/operations/route";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

function makeRequest(
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
) {
  return new NextRequest(`http://localhost:3000${url}`, init);
}

function makeSessionParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
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

/* ────── Operations ────── */

describe("GET /api/monitoring/operations", () => {
  it("returns operations with pagination", async () => {
    const result = { operations: [{ id: "op-1" }], total: 1 };
    vi.mocked(monitoringService.getOperations).mockResolvedValue(result);

    const req = makeRequest("/api/monitoring/operations?page=2&size=10");
    const res = await operationsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(result);
    expect(monitoringService.getOperations).toHaveBeenCalledWith(2, 10);
  });

  it("uses default pagination", async () => {
    vi.mocked(monitoringService.getOperations).mockResolvedValue({
      operations: [],
      total: 0,
    });

    const req = makeRequest("/api/monitoring/operations");
    await operationsGET(req);

    expect(monitoringService.getOperations).toHaveBeenCalledWith(0, 50);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/monitoring/operations");
    const res = await operationsGET(req);

    expect(res.status).toBe(401);
  });
});

describe("POST /api/monitoring/operations", () => {
  it("creates operation", async () => {
    const op = { id: "op-1", type: "test" };
    vi.mocked(monitoringService.createOperation).mockResolvedValue(op);

    const req = makeRequest("/api/monitoring/operations", {
      method: "POST",
      body: JSON.stringify({ type: "test" }),
      headers: { "content-type": "application/json" },
    });
    const res = await operationsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(op);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/monitoring/operations", {
      method: "POST",
      body: JSON.stringify({ type: "test" }),
      headers: { "content-type": "application/json" },
    });
    const res = await operationsPOST(req);

    expect(res.status).toBe(401);
  });
});

/* ────── Batch Operations ────── */

describe("POST /api/monitoring/operations/batch", () => {
  it("batch creates operations", async () => {
    const ops = [{ id: "op-1" }, { id: "op-2" }];
    vi.mocked(monitoringService.batchCreateOperations).mockResolvedValue(ops);

    const req = makeRequest("/api/monitoring/operations/batch", {
      method: "POST",
      body: JSON.stringify([{ type: "a" }, { type: "b" }]),
      headers: { "content-type": "application/json" },
    });
    const res = await batchPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(ops);
  });
});

/* ────── Sessions ────── */

describe("GET /api/monitoring/sessions", () => {
  it("returns sessions with pagination", async () => {
    const result = { sessions: [{ id: "s-1" }], total: 1 };
    vi.mocked(monitoringService.getSessions).mockResolvedValue(result);

    const req = makeRequest("/api/monitoring/sessions?page=1&size=5");
    const res = await sessionsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(result);
    expect(monitoringService.getSessions).toHaveBeenCalledWith(1, 5);
  });

  it("uses default pagination (page=0, size=20)", async () => {
    vi.mocked(monitoringService.getSessions).mockResolvedValue({
      sessions: [],
      total: 0,
    });

    const req = makeRequest("/api/monitoring/sessions");
    await sessionsGET(req);

    expect(monitoringService.getSessions).toHaveBeenCalledWith(0, 20);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/monitoring/sessions");
    const res = await sessionsGET(req);

    expect(res.status).toBe(401);
  });
});

describe("POST /api/monitoring/sessions", () => {
  it("creates session", async () => {
    const session = { id: "s-1", name: "Test" };
    vi.mocked(monitoringService.createSession).mockResolvedValue(session);

    const req = makeRequest("/api/monitoring/sessions", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
      headers: { "content-type": "application/json" },
    });
    const res = await sessionsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(session);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/monitoring/sessions", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
      headers: { "content-type": "application/json" },
    });
    const res = await sessionsPOST(req);

    expect(res.status).toBe(401);
  });
});

/* ────── Session [sessionId] ────── */

describe("DELETE /api/monitoring/sessions/[sessionId]", () => {
  it("ends session and returns 204", async () => {
    vi.mocked(monitoringService.endSession).mockResolvedValue(undefined);

    const req = makeRequest("/api/monitoring/sessions/s-1", {
      method: "DELETE",
    });
    const res = await sessionDELETE(req, makeSessionParams("s-1"));

    expect(res.status).toBe(204);
    expect(monitoringService.endSession).toHaveBeenCalledWith("s-1");
  });
});

/* ────── Session Details ────── */

describe("GET /api/monitoring/sessions/[sessionId]/details", () => {
  it("returns session details", async () => {
    const details = { id: "s-1", operationCount: 5 };
    vi.mocked(monitoringService.getSessionDetails).mockResolvedValue(details);

    const req = makeRequest("/api/monitoring/sessions/s-1/details");
    const res = await sessionDetailsGET(req, makeSessionParams("s-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(details);
  });

  it("returns 404 when session not found", async () => {
    vi.mocked(monitoringService.getSessionDetails).mockRejectedValue(
      new Error("Not found"),
    );

    const req = makeRequest("/api/monitoring/sessions/s-1/details");
    const res = await sessionDetailsGET(req, makeSessionParams("s-1"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });
});

/* ────── Session Operations ────── */

describe("GET /api/monitoring/sessions/[sessionId]/operations", () => {
  it("returns operations for session", async () => {
    const ops = [{ id: "op-1" }, { id: "op-2" }];
    vi.mocked(monitoringService.getSessionOperations).mockResolvedValue(ops);

    const req = makeRequest("/api/monitoring/sessions/s-1/operations");
    const res = await sessionOperationsGET(req, makeSessionParams("s-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(ops);
    expect(monitoringService.getSessionOperations).toHaveBeenCalledWith("s-1");
  });
});
