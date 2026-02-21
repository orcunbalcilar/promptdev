/**
 * User management service.
 * Port of Java UserService with encryption support.
 */
import { db } from "../db";
import { users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt, getEncryptionKey } from "./encryption";

export interface UserProfileDto {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: string;
  bitbucketUrl: string | null;
  bitbucketProjectKey: string | null;
  bitbucketUsername: string | null;
  bitbucketTokenSet: boolean;
  copilotTokenSet: boolean;
  byokProviderType: string | null;
  byokBaseUrl: string | null;
  byokApiKeySet: boolean;
  jiraUrl: string | null;
  jiraProjectKey: string | null;
  jiraUsername: string | null;
  jiraTokenSet: boolean;
  jiraAutoTaskEnabled: boolean;
  jiraAutoTaskModelId: string | null;
  jiraAutoTaskRepository: string | null;
  jiraAutoTaskSourceBranch: string | null;
  jiraAutoTaskTargetBranch: string | null;
  jiraAutoTaskPrompt: string | null;
  jiraAutoTaskIterative: boolean | null;
  jiraAutoTaskMaxIterations: number | null;
  jiraAutoTaskReviewEnabled: boolean | null;
  customSystemPrompt: string | null;
}

export interface UpdateUserSettingsRequest {
  bitbucketUrl?: string;
  bitbucketProjectKey?: string;
  bitbucketUsername?: string;
  bitbucketToken?: string;
  copilotToken?: string;
  byokProviderType?: string;
  byokBaseUrl?: string;
  byokApiKey?: string;
  byokAzureApiVersion?: string;
  jiraUrl?: string;
  jiraProjectKey?: string;
  jiraUsername?: string;
  jiraToken?: string;
  jiraAutoTaskEnabled?: boolean;
  jiraAutoTaskModelId?: string;
  jiraAutoTaskRepository?: string;
  jiraAutoTaskSourceBranch?: string;
  jiraAutoTaskTargetBranch?: string;
  jiraAutoTaskPrompt?: string;
  jiraAutoTaskIterative?: boolean;
  jiraAutoTaskMaxIterations?: number;
  jiraAutoTaskReviewEnabled?: boolean;
  customSystemPrompt?: string;
}

export async function findOrCreateUser(
  provider: string,
  providerAccountId: string,
  email: string,
  name?: string,
  avatarUrl?: string,
) {
  const existing = await db
    .select()
    .from(users)
    .where(and(eq(users.provider, provider), eq(users.providerAccountId, providerAccountId)))
    .limit(1);

  if (existing.length > 0) {
    const user = existing[0];
    const [updated] = await db
      .update(users)
      .set({ name: name ?? user.name, avatarUrl: avatarUrl ?? user.avatarUrl, email })
      .where(eq(users.id, user.id))
      .returning();
    return updated;
  }

  const [newUser] = await db
    .insert(users)
    .values({ provider, providerAccountId, email, name, avatarUrl })
    .returning();
  return newUser;
}

export async function getUserProfile(userId: string): Promise<UserProfileDto> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error(`User not found: ${userId}`);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
    bitbucketUrl: user.bitbucketUrl,
    bitbucketProjectKey: user.bitbucketProjectKey,
    bitbucketUsername: user.bitbucketUsername,
    bitbucketTokenSet: user.bitbucketTokenEncrypted !== null,
    copilotTokenSet: user.copilotTokenEncrypted !== null,
    byokProviderType: user.byokProviderType,
    byokBaseUrl: user.byokBaseUrl,
    byokApiKeySet: user.byokApiKeyEncrypted !== null,
    jiraUrl: user.jiraUrl,
    jiraProjectKey: user.jiraProjectKey,
    jiraUsername: user.jiraUsername,
    jiraTokenSet: user.jiraTokenEncrypted !== null,
    jiraAutoTaskEnabled: user.jiraAutoTaskEnabled ?? true,
    jiraAutoTaskModelId: user.jiraAutoTaskModelId,
    jiraAutoTaskRepository: user.jiraAutoTaskRepository,
    jiraAutoTaskSourceBranch: user.jiraAutoTaskSourceBranch,
    jiraAutoTaskTargetBranch: user.jiraAutoTaskTargetBranch,
    jiraAutoTaskPrompt: user.jiraAutoTaskPrompt,
    jiraAutoTaskIterative: user.jiraAutoTaskIterative,
    jiraAutoTaskMaxIterations: user.jiraAutoTaskMaxIterations,
    jiraAutoTaskReviewEnabled: user.jiraAutoTaskReviewEnabled,
    customSystemPrompt: user.customSystemPrompt,
  };
}

export async function updateSettings(
  userId: string,
  request: UpdateUserSettingsRequest,
): Promise<UserProfileDto> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error(`User not found: ${userId}`);

  const key = getEncryptionKey();
  const updates: Record<string, unknown> = {};

  // Bitbucket
  if (request.bitbucketUrl !== undefined) updates.bitbucketUrl = request.bitbucketUrl || null;
  if (request.bitbucketProjectKey !== undefined) updates.bitbucketProjectKey = request.bitbucketProjectKey || null;
  if (request.bitbucketUsername !== undefined) updates.bitbucketUsername = request.bitbucketUsername || null;
  if (request.bitbucketToken !== undefined) {
    updates.bitbucketTokenEncrypted = request.bitbucketToken ? encrypt(request.bitbucketToken, key) : null;
  }

  // Copilot
  if (request.copilotToken !== undefined) {
    updates.copilotTokenEncrypted = request.copilotToken ? encrypt(request.copilotToken, key) : null;
  }

  // BYOK
  if (request.byokProviderType !== undefined) updates.byokProviderType = request.byokProviderType || null;
  if (request.byokBaseUrl !== undefined) updates.byokBaseUrl = request.byokBaseUrl || null;
  if (request.byokApiKey !== undefined) {
    updates.byokApiKeyEncrypted = request.byokApiKey ? encrypt(request.byokApiKey, key) : null;
  }
  if (request.byokAzureApiVersion !== undefined) updates.byokAzureApiVersion = request.byokAzureApiVersion || null;

  // Jira
  if (request.jiraUrl !== undefined) updates.jiraUrl = request.jiraUrl || null;
  if (request.jiraProjectKey !== undefined) updates.jiraProjectKey = request.jiraProjectKey || null;
  if (request.jiraUsername !== undefined) updates.jiraUsername = request.jiraUsername || null;
  if (request.jiraToken !== undefined) {
    updates.jiraTokenEncrypted = request.jiraToken ? encrypt(request.jiraToken, key) : null;
  }

  // Jira auto-task settings
  if (request.jiraAutoTaskEnabled !== undefined) updates.jiraAutoTaskEnabled = request.jiraAutoTaskEnabled;
  if (request.jiraAutoTaskModelId !== undefined) updates.jiraAutoTaskModelId = request.jiraAutoTaskModelId || null;
  if (request.jiraAutoTaskRepository !== undefined) updates.jiraAutoTaskRepository = request.jiraAutoTaskRepository || null;
  if (request.jiraAutoTaskSourceBranch !== undefined) updates.jiraAutoTaskSourceBranch = request.jiraAutoTaskSourceBranch || null;
  if (request.jiraAutoTaskTargetBranch !== undefined) updates.jiraAutoTaskTargetBranch = request.jiraAutoTaskTargetBranch || null;
  if (request.jiraAutoTaskPrompt !== undefined) updates.jiraAutoTaskPrompt = request.jiraAutoTaskPrompt || null;
  if (request.jiraAutoTaskIterative !== undefined) updates.jiraAutoTaskIterative = request.jiraAutoTaskIterative;
  if (request.jiraAutoTaskMaxIterations !== undefined) updates.jiraAutoTaskMaxIterations = request.jiraAutoTaskMaxIterations;
  if (request.jiraAutoTaskReviewEnabled !== undefined) updates.jiraAutoTaskReviewEnabled = request.jiraAutoTaskReviewEnabled;

  // Custom system prompt
  if (request.customSystemPrompt !== undefined) {
    updates.customSystemPrompt = request.customSystemPrompt?.trim() || null;
  }

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, userId));
  }

  return getUserProfile(userId);
}

export async function getDecryptedCopilotToken(userId: string): Promise<string | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.copilotTokenEncrypted) return null;
  return decrypt(user.copilotTokenEncrypted, getEncryptionKey());
}

export async function getDecryptedBitbucketToken(userId: string): Promise<string | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.bitbucketTokenEncrypted) return null;
  return decrypt(user.bitbucketTokenEncrypted, getEncryptionKey());
}

export async function getDecryptedByokApiKey(userId: string): Promise<string | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.byokApiKeyEncrypted) return null;
  return decrypt(user.byokApiKeyEncrypted, getEncryptionKey());
}

export async function getUsersWithJiraAutoTask() {
  return db.select().from(users).where(eq(users.jiraAutoTaskEnabled, true));
}
