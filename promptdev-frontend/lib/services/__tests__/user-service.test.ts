import { describe, it, expect, vi, beforeEach } from "vitest";
import { chainResult } from "./db-mock-helper";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  users: {},
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
}));
vi.mock("@/lib/services/encryption", () => ({
  encrypt: vi.fn((val: string) => `enc:${val}`),
  decrypt: vi.fn((val: string) => val.replace("enc:", "")),
  getEncryptionKey: vi.fn().mockReturnValue(Buffer.alloc(32)),
}));

import {
  findOrCreateUser,
  getUserProfile,
  updateSettings,
  getDecryptedCopilotToken,
  getUsersWithJiraAutoTask,
} from "../user-service";

const NOW = new Date("2025-01-15T10:00:00Z");

function makeUser(overrides = {}) {
  return {
    id: "user-1",
    provider: "github",
    providerAccountId: "acc-123",
    email: "test@example.com",
    name: "Test User",
    avatarUrl: "https://example.com/avatar.png",
    bitbucketUrl: "https://bb.example.com",
    bitbucketProjectKey: "PROJ",
    bitbucketUsername: "admin",
    bitbucketTokenEncrypted: "enc:bb-token",
    copilotTokenEncrypted: "enc:cp-token",
    byokProviderType: null,
    byokBaseUrl: null,
    byokApiKeyEncrypted: null,
    byokAzureApiVersion: null,
    jiraUrl: "https://jira.example.com",
    jiraProjectKey: "PROJ",
    jiraUsername: "admin",
    jiraTokenEncrypted: "enc:jira-token",
    jiraAutoTaskEnabled: true,
    jiraAutoTaskModelId: null,
    jiraAutoTaskRepository: null,
    jiraAutoTaskSourceBranch: null,
    jiraAutoTaskTargetBranch: null,
    jiraAutoTaskPrompt: null,
    jiraAutoTaskIterative: null,
    jiraAutoTaskMaxIterations: null,
    jiraAutoTaskReviewEnabled: null,
    customSystemPrompt: null,
    createdAt: NOW,
    updatedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("user-service", () => {
  describe("findOrCreateUser", () => {
    it("should update existing user on match", async () => {
      const existing = makeUser();
      const updated = makeUser({ name: "Updated Name" });
      mockDb.select.mockReturnValueOnce(chainResult([existing]));
      mockDb.update.mockReturnValue(chainResult([updated]));

      const result = await findOrCreateUser("github", "acc-123", "test@example.com", "Updated Name");

      expect(result.name).toBe("Updated Name");
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should create new user when no match", async () => {
      const newUser = makeUser({ id: "user-new" });
      mockDb.select.mockReturnValueOnce(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([newUser]));

      const result = await findOrCreateUser("github", "acc-456", "new@example.com", "New User");

      expect(result.id).toBe("user-new");
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("getUserProfile", () => {
    it("should return user profile DTO", async () => {
      const user = makeUser();
      mockDb.select.mockReturnValueOnce(chainResult([user]));

      const profile = await getUserProfile("user-1");

      expect(profile.id).toBe("user-1");
      expect(profile.email).toBe("test@example.com");
      expect(profile.bitbucketTokenSet).toBe(true);
      expect(profile.copilotTokenSet).toBe(true);
      expect(profile.jiraTokenSet).toBe(true);
      expect(profile.byokApiKeySet).toBe(false);
    });

    it("should throw when user not found", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      await expect(getUserProfile("nonexistent")).rejects.toThrow("User not found");
    });
  });

  describe("updateSettings", () => {
    it("should update bitbucket settings and encrypt token", async () => {
      const user = makeUser();
      mockDb.select
        .mockReturnValueOnce(chainResult([user])) // findUser
        .mockReturnValueOnce(chainResult([user])); // getUserProfile
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await updateSettings("user-1", {
        bitbucketUrl: "https://new-bb.example.com",
        bitbucketToken: "new-token",
      });

      expect(result.id).toBe("user-1");
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should clear token when empty string provided", async () => {
      const user = makeUser();
      mockDb.select
        .mockReturnValueOnce(chainResult([user]))
        .mockReturnValueOnce(chainResult([user]));
      mockDb.update.mockReturnValue(chainResult([]));

      await updateSettings("user-1", {
        bitbucketToken: "",
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should throw when user not found", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      await expect(
        updateSettings("nonexistent", { bitbucketUrl: "test" }),
      ).rejects.toThrow("User not found");
    });
  });

  describe("getDecryptedCopilotToken", () => {
    it("should return decrypted token", async () => {
      const user = makeUser({ copilotTokenEncrypted: "enc:my-token" });
      mockDb.select.mockReturnValueOnce(chainResult([user]));

      const token = await getDecryptedCopilotToken("user-1");

      expect(token).toBe("my-token");
    });

    it("should return null when no token set", async () => {
      const user = makeUser({ copilotTokenEncrypted: null });
      mockDb.select.mockReturnValueOnce(chainResult([user]));

      const token = await getDecryptedCopilotToken("user-1");

      expect(token).toBeNull();
    });

    it("should return null when user not found", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      const token = await getDecryptedCopilotToken("nonexistent");

      expect(token).toBeNull();
    });
  });

  describe("getUsersWithJiraAutoTask", () => {
    it("should return users with jira auto task enabled", async () => {
      const users = [makeUser(), makeUser({ id: "user-2" })];
      mockDb.select.mockReturnValue(chainResult(users));

      const result = await getUsersWithJiraAutoTask();

      expect(result).toHaveLength(2);
    });
  });
});
