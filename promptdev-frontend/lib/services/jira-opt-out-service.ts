/**
 * Jira Issue Opt-Out service — manages user opt-outs for automatic Jira task creation.
 */
import { getDb } from "../db";
import { jiraIssueOptOuts } from "../db/schema";
import { eq, and } from "drizzle-orm";

export interface OptOutResponse {
  id: string;
  userId: string;
  jiraIssueKey: string;
  reason: string | null;
  createdAt: string;
}

function toResponse(o: typeof jiraIssueOptOuts.$inferSelect): OptOutResponse {
  return {
    id: o.id,
    userId: o.userId,
    jiraIssueKey: o.jiraIssueKey,
    reason: o.reason,
    createdAt: o.createdAt.toISOString(),
  };
}

export async function getOptOutsForUser(userId: string): Promise<OptOutResponse[]> {
  const result = await getDb()
    .select()
    .from(jiraIssueOptOuts)
    .where(eq(jiraIssueOptOuts.userId, userId));
  return result.map(toResponse);
}

export async function createOptOut(
  userId: string,
  jiraIssueKey: string,
  reason?: string,
): Promise<OptOutResponse> {
  const [optOut] = await getDb()
    .insert(jiraIssueOptOuts)
    .values({ userId, jiraIssueKey, reason, createdAt: new Date() })
    .onConflictDoNothing()
    .returning();

  if (!optOut) {
    // Already exists — return existing
    const [existing] = await getDb()
      .select()
      .from(jiraIssueOptOuts)
      .where(and(eq(jiraIssueOptOuts.userId, userId), eq(jiraIssueOptOuts.jiraIssueKey, jiraIssueKey)))
      .limit(1);
    return toResponse(existing);
  }

  return toResponse(optOut);
}

export async function deleteOptOut(userId: string, jiraIssueKey: string): Promise<void> {
  await getDb()
    .delete(jiraIssueOptOuts)
    .where(
      and(eq(jiraIssueOptOuts.userId, userId), eq(jiraIssueOptOuts.jiraIssueKey, jiraIssueKey)),
    );
}

export async function isOptedOut(userId: string, jiraIssueKey: string): Promise<boolean> {
  const result = await getDb()
    .select()
    .from(jiraIssueOptOuts)
    .where(and(eq(jiraIssueOptOuts.userId, userId), eq(jiraIssueOptOuts.jiraIssueKey, jiraIssueKey)))
    .limit(1);
  return result.length > 0;
}
