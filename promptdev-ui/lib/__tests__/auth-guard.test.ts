import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

// Use vi.hoisted so these are available inside vi.mock factories (which are hoisted)
const { mockAuth, mockSelect, mockFrom, mockWhere, mockLimit } = vi.hoisted(
  () => ({
    mockAuth: vi.fn(),
    mockSelect: vi.fn(),
    mockFrom: vi.fn(),
    mockWhere: vi.fn(),
    mockLimit: vi.fn(),
  }),
);

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: mockSelect,
  }),
}));

vi.mock("@/lib/db/schema", () => ({
  tasks: {
    id: "id",
    userId: "userId",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: string, val: string) => ({ col, val }),
}));

import {
  requireAuth,
  requireOwnership,
  requireTaskOwnership,
} from "../auth-guard";

function fakeSession(overrides: Partial<Session> = {}): Session {
  return {
    user: { id: "user-1", name: "Test" },
    expires: "",
    ...overrides,
  } as Session;
}

describe("auth-guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up the select chain
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
  });

  describe("requireAuth", () => {
    it("returns session when user is authenticated", async () => {
      const session = fakeSession();
      mockAuth.mockResolvedValue(session);

      const result = await requireAuth();
      expect(result.session).toBe(session);
      expect(result.error).toBeUndefined();
    });

    it("returns 401 when no session exists", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await requireAuth();
      expect(result.error).toBeDefined();
      expect(result.error!.status).toBe(401);
    });

    it("returns 401 when session has no user id", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Test" }, expires: "" });

      const result = await requireAuth();
      expect(result.error).toBeDefined();
      expect(result.error!.status).toBe(401);
    });
  });

  describe("requireOwnership", () => {
    it("returns null when user owns the resource", () => {
      const session = fakeSession();
      const result = requireOwnership(session, "user-1");
      expect(result).toBeNull();
    });

    it("returns 403 when user does not own the resource", () => {
      const session = fakeSession();
      const result = requireOwnership(session, "user-2");
      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    });
  });

  describe("requireTaskOwnership", () => {
    const session = fakeSession();

    it("returns null when user owns the task", async () => {
      mockLimit.mockResolvedValue([{ userId: "user-1" }]);

      const result = await requireTaskOwnership(session, "task-1");
      expect(result).toBeNull();
    });

    it("returns 404 when task does not exist", async () => {
      mockLimit.mockResolvedValue([]);

      const result = await requireTaskOwnership(session, "task-nonexistent");
      expect(result).not.toBeNull();
      expect(result!.status).toBe(404);
    });

    it("returns 403 when user does not own the task", async () => {
      mockLimit.mockResolvedValue([{ userId: "user-2" }]);

      const result = await requireTaskOwnership(session, "task-1");
      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    });

    it("allows access to tasks with no userId (e.g. scheduled jobs)", async () => {
      mockLimit.mockResolvedValue([{ userId: null }]);

      const result = await requireTaskOwnership(session, "task-shared");
      expect(result).toBeNull();
    });
  });
});
