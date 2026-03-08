import { describe, it, expect, vi, beforeEach } from "vitest";
import { chainResult } from "./db-mock-helper";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
  getDb: () => mockDb,
}));
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
  updateSettings,
  getDecryptedBitbucketToken,
  getDecryptedByokApiKey,
  getUserProfile,
} from "../user-service";

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
    byokProviderType: "openai",
    byokBaseUrl: "https://api.openai.com/v1",
    byokApiKeyEncrypted: "enc:byok-key",
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
    createdAt: new Date("2025-01-15T10:00:00Z"),
    updatedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("user-service - extended coverage", () => {
  describe("getDecryptedBitbucketToken", () => {
    it("should return decrypted token when present", async () => {
      const user = makeUser({ bitbucketTokenEncrypted: "enc:bb-secret" });
      mockDb.select.mockReturnValueOnce(chainResult([user]));

      const token = await getDecryptedBitbucketToken("user-1");
      expect(token).toBe("bb-secret");
    });

    it("should return null when no token set", async () => {
      const user = makeUser({ bitbucketTokenEncrypted: null });
      mockDb.select.mockReturnValueOnce(chainResult([user]));

      const token = await getDecryptedBitbucketToken("user-1");
      expect(token).toBeNull();
    });

    it("should return null when user not found", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      const token = await getDecryptedBitbucketToken("nonexistent");
      expect(token).toBeNull();
    });
  });

  describe("getDecryptedByokApiKey", () => {
    it("should return decrypted key when present", async () => {
      const user = makeUser({ byokApiKeyEncrypted: "enc:api-key-123" });
      mockDb.select.mockReturnValueOnce(chainResult([user]));

      const key = await getDecryptedByokApiKey("user-1");
      expect(key).toBe("api-key-123");
    });

    it("should return null when no key set", async () => {
      const user = makeUser({ byokApiKeyEncrypted: null });
      mockDb.select.mockReturnValueOnce(chainResult([user]));

      const key = await getDecryptedByokApiKey("user-1");
      expect(key).toBeNull();
    });

    it("should return null when user not found", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      const key = await getDecryptedByokApiKey("nonexistent");
      expect(key).toBeNull();
    });
  });

  describe("updateSettings - extended field coverage", () => {
    it("should update copilot token", async () => {
      const user = makeUser();
      mockDb.select
        .mockReturnValueOnce(chainResult([user]))
        .mockReturnValueOnce(chainResult([user]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await updateSettings("user-1", {
        copilotToken: "new-cp-token",
      });

      expect(result.id).toBe("user-1");
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should update BYOK settings", async () => {
      const user = makeUser();
      mockDb.select
        .mockReturnValueOnce(chainResult([user]))
        .mockReturnValueOnce(chainResult([user]));
      mockDb.update.mockReturnValue(chainResult([]));

      await updateSettings("user-1", {
        byokProviderType: "azure",
        byokBaseUrl: "https://my.azure.com",
        byokApiKey: "az-key",
        byokAzureApiVersion: "2024-10-21",
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should update Jira settings", async () => {
      const user = makeUser();
      mockDb.select
        .mockReturnValueOnce(chainResult([user]))
        .mockReturnValueOnce(chainResult([user]));
      mockDb.update.mockReturnValue(chainResult([]));

      await updateSettings("user-1", {
        jiraUrl: "https://jira.new.com",
        jiraProjectKey: "NEW",
        jiraUsername: "newuser",
        jiraToken: "jira-secret",
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should update Jira auto-task settings", async () => {
      const user = makeUser();
      mockDb.select
        .mockReturnValueOnce(chainResult([user]))
        .mockReturnValueOnce(chainResult([user]));
      mockDb.update.mockReturnValue(chainResult([]));

      await updateSettings("user-1", {
        jiraAutoTaskEnabled: true,
        jiraAutoTaskModelId: "gpt-4",
        jiraAutoTaskRepository: "my-repo",
        jiraAutoTaskSourceBranch: "main",
        jiraAutoTaskTargetBranch: "develop",
        jiraAutoTaskPrompt: "Fix the bug",
        jiraAutoTaskIterative: true,
        jiraAutoTaskMaxIterations: 5,
        jiraAutoTaskReviewEnabled: true,
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should update custom system prompt", async () => {
      const user = makeUser();
      mockDb.select
        .mockReturnValueOnce(chainResult([user]))
        .mockReturnValueOnce(chainResult([user]));
      mockDb.update.mockReturnValue(chainResult([]));

      await updateSettings("user-1", {
        customSystemPrompt: "  You are a helpful assistant  ",
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should clear custom system prompt when empty string", async () => {
      const user = makeUser();
      mockDb.select
        .mockReturnValueOnce(chainResult([user]))
        .mockReturnValueOnce(chainResult([user]));
      mockDb.update.mockReturnValue(chainResult([]));

      await updateSettings("user-1", {
        customSystemPrompt: "   ",
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should not call update when no updates provided", async () => {
      const user = makeUser();
      mockDb.select
        .mockReturnValueOnce(chainResult([user]))
        .mockReturnValueOnce(chainResult([user]));

      await updateSettings("user-1", {});

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("should clear BYOK key when empty string provided", async () => {
      const user = makeUser();
      mockDb.select
        .mockReturnValueOnce(chainResult([user]))
        .mockReturnValueOnce(chainResult([user]));
      mockDb.update.mockReturnValue(chainResult([]));

      await updateSettings("user-1", {
        byokApiKey: "",
      });

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe("getUserProfile - field mapping", () => {
    it("should map BYOK fields correctly", async () => {
      const user = makeUser({
        byokProviderType: "anthropic",
        byokBaseUrl: "https://api.anthropic.com",
        byokApiKeyEncrypted: "enc:key",
      });
      mockDb.select.mockReturnValueOnce(chainResult([user]));

      const profile = await getUserProfile("user-1");

      expect(profile.byokProviderType).toBe("anthropic");
      expect(profile.byokBaseUrl).toBe("https://api.anthropic.com");
      expect(profile.byokApiKeySet).toBe(true);
    });

    it("should map Jira auto-task fields correctly", async () => {
      const user = makeUser({
        jiraAutoTaskEnabled: false,
        jiraAutoTaskModelId: "gpt-4",
        jiraAutoTaskRepository: "repo",
        jiraAutoTaskSourceBranch: "main",
        jiraAutoTaskTargetBranch: "dev",
        jiraAutoTaskPrompt: "Fix bugs",
        jiraAutoTaskIterative: true,
        jiraAutoTaskMaxIterations: 3,
        jiraAutoTaskReviewEnabled: false,
      });
      mockDb.select.mockReturnValueOnce(chainResult([user]));

      const profile = await getUserProfile("user-1");

      expect(profile.jiraAutoTaskEnabled).toBe(false);
      expect(profile.jiraAutoTaskModelId).toBe("gpt-4");
      expect(profile.jiraAutoTaskIterative).toBe(true);
      expect(profile.jiraAutoTaskMaxIterations).toBe(3);
      expect(profile.jiraAutoTaskReviewEnabled).toBe(false);
    });

    it("should handle null jiraAutoTaskEnabled as true default", async () => {
      const user = makeUser({ jiraAutoTaskEnabled: null });
      mockDb.select.mockReturnValueOnce(chainResult([user]));

      const profile = await getUserProfile("user-1");

      // null ?? true = true
      expect(profile.jiraAutoTaskEnabled).toBe(true);
    });
  });
});
