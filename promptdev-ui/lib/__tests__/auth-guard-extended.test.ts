import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

// Hoisted mocks for dynamic imports inside auth-guard
const {
  mockAuth,
  mockSelect,
  mockFrom,
  mockWhere,
  mockLimit,
  mockInsert,
  mockValues,
  mockOnConflictDoNothing,
  mockReturning,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
  mockInsert: vi.fn(),
  mockValues: vi.fn(),
  mockOnConflictDoNothing: vi.fn(),
  mockReturning: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: mockSelect,
    insert: mockInsert,
  }),
}));

vi.mock("@/lib/db/schema", () => ({
  users: {
    id: "id",
    provider: "provider",
    providerAccountId: "providerAccountId",
    email: "email",
    name: "name",
    avatarUrl: "avatarUrl",
  },
  tasks: {
    id: "id",
    userId: "userId",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: string, val: string) => ({ col, val }),
}));

import { ensureUserExists, requireTaskOwnership } from "../auth-guard";

function fakeSession(overrides: Partial<Session> = {}): Session {
  return {
    user: { id: "user-1", name: "Test User", email: "test@example.com", image: "https://avatar.url/test.png" },
    expires: "2030-01-01",
    ...overrides,
  } as Session;
}

describe("ensureUserExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // select chain
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    // insert chain
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
    mockOnConflictDoNothing.mockReturnValue({ returning: mockReturning });
  });

  it("returns existing user id when user is found in DB", async () => {
    mockLimit.mockResolvedValue([{ id: "user-1" }]);

    const result = await ensureUserExists(fakeSession());
    expect(result).toBe("user-1");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("creates user when not found and returns new user id", async () => {
    mockLimit.mockResolvedValue([]); // user not found
    mockReturning.mockResolvedValue([{ id: "user-1" }]);

    const result = await ensureUserExists(fakeSession());
    expect(result).toBe("user-1");
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatarUrl: "https://avatar.url/test.png",
      }),
    );
  });

  it("uses provider from session extension if available", async () => {
    mockLimit.mockResolvedValue([]);
    mockReturning.mockResolvedValue([{ id: "user-1" }]);

    const session = fakeSession();
    (session.user as Record<string, unknown>).provider = "github";
    await ensureUserExists(session);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "github" }),
    );
  });

  it("uses 'unknown' provider when none in session", async () => {
    mockLimit.mockResolvedValue([]);
    mockReturning.mockResolvedValue([{ id: "user-1" }]);

    await ensureUserExists(fakeSession());

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "unknown" }),
    );
  });

  it("falls back to userId when insert returns empty (onConflictDoNothing)", async () => {
    mockLimit.mockResolvedValue([]); // user not found
    mockReturning.mockResolvedValue([]); // onConflictDoNothing returned nothing

    const result = await ensureUserExists(fakeSession());
    expect(result).toBe("user-1"); // Falls back to userId from session
  });

  it("throws when session has no user id", async () => {
    const session = { user: { name: "No ID" }, expires: "" } as Session;
    await expect(ensureUserExists(session)).rejects.toThrow("No user ID in session");
  });

  it("handles session with empty email and name", async () => {
    mockLimit.mockResolvedValue([]);
    mockReturning.mockResolvedValue([{ id: "user-1" }]);

    const session = fakeSession();
    session.user!.email = undefined as unknown as string;
    session.user!.name = undefined as unknown as string;
    session.user!.image = undefined as unknown as string;

    await ensureUserExists(session);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "",
        name: undefined,
        avatarUrl: undefined,
      }),
    );
  });
});

describe("requireTaskOwnership – extended", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
  });

  it("allows access when task userId is null (scheduled job task)", async () => {
    mockLimit.mockResolvedValue([{ userId: null }]);

    const session = fakeSession();
    const result = await requireTaskOwnership(session, "scheduled-task-1");
    expect(result).toBeNull();
  });

  it("allows access when task userId is undefined (legacy)", async () => {
    mockLimit.mockResolvedValue([{ userId: undefined }]);

    const session = fakeSession();
    const result = await requireTaskOwnership(session, "legacy-task-1");
    expect(result).toBeNull();
  });

  it("returns 403 when task belongs to a different user", async () => {
    mockLimit.mockResolvedValue([{ userId: "other-user" }]);

    const session = fakeSession();
    const result = await requireTaskOwnership(session, "task-1");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("returns 404 when task does not exist at all", async () => {
    mockLimit.mockResolvedValue([]);

    const session = fakeSession();
    const result = await requireTaskOwnership(session, "nonexistent");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(404);
  });

  it("allows access when task userId matches session user", async () => {
    mockLimit.mockResolvedValue([{ userId: "user-1" }]);

    const session = fakeSession();
    const result = await requireTaskOwnership(session, "my-task");
    expect(result).toBeNull();
  });
});
