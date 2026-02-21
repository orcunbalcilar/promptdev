/**
 * Monitoring service — session and operation tracking for Copilot agent monitoring.
 */
import { db } from "../db";
import { copilotSessions, copilotOperations } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

// ── Types ───────────────────────────────────────────────────────

export interface CreateSessionRequest {
  sdkSessionId: string;
  taskId?: string;
  model: string;
  reasoningEffort?: string;
  source?: string;
}

export interface CreateOperationRequest {
  sessionId?: string;
  taskId?: string;
  operationType: string;
  model?: string;
  message?: string;
  details?: string;
  toolName?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
  source?: string;
  clientInfo?: string;
}

export interface DashboardMetrics {
  totalSessions: number;
  activeSessions: number;
  totalOperations: number;
  recentSessions: SessionResponse[];
}

export interface SessionResponse {
  id: string;
  sdkSessionId: string;
  taskId: string | null;
  model: string;
  reasoningEffort: string | null;
  status: string;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  messageCount: number | null;
  toolExecutionCount: number | null;
  errorCount: number | null;
  source: string | null;
  createdAt: string;
  endedAt: string | null;
}

export interface OperationResponse {
  id: string;
  sessionId: string | null;
  taskId: string | null;
  operationType: string;
  model: string | null;
  message: string | null;
  details: string | null;
  toolName: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number | null;
  success: boolean | null;
  errorMessage: string | null;
  source: string | null;
  clientInfo: string | null;
  timestamp: string;
}

function toSessionResponse(s: typeof copilotSessions.$inferSelect): SessionResponse {
  return {
    id: s.id,
    sdkSessionId: s.sdkSessionId,
    taskId: s.taskId,
    model: s.model,
    reasoningEffort: s.reasoningEffort,
    status: s.status,
    totalInputTokens: s.totalInputTokens,
    totalOutputTokens: s.totalOutputTokens,
    messageCount: s.messageCount,
    toolExecutionCount: s.toolExecutionCount,
    errorCount: s.errorCount,
    source: s.source,
    createdAt: s.createdAt.toISOString(),
    endedAt: s.endedAt?.toISOString() ?? null,
  };
}

function toOperationResponse(o: typeof copilotOperations.$inferSelect): OperationResponse {
  return {
    id: o.id,
    sessionId: o.sessionId,
    taskId: o.taskId,
    operationType: o.operationType,
    model: o.model,
    message: o.message,
    details: o.details,
    toolName: o.toolName,
    inputTokens: o.inputTokens,
    outputTokens: o.outputTokens,
    durationMs: o.durationMs,
    success: o.success,
    errorMessage: o.errorMessage,
    source: o.source,
    clientInfo: o.clientInfo,
    timestamp: o.timestamp.toISOString(),
  };
}

// ── Sessions ────────────────────────────────────────────────────

export async function createSession(req: CreateSessionRequest): Promise<SessionResponse> {
  const [session] = await db
    .insert(copilotSessions)
    .values({
      sdkSessionId: req.sdkSessionId,
      taskId: req.taskId,
      model: req.model,
      reasoningEffort: req.reasoningEffort,
      status: "ACTIVE",
      source: req.source ?? "web",
    })
    .returning();
  return toSessionResponse(session);
}

export async function endSession(
  sdkSessionId: string,
  errorMessage?: string,
): Promise<SessionResponse> {
  const [session] = await db
    .select()
    .from(copilotSessions)
    .where(eq(copilotSessions.sdkSessionId, sdkSessionId))
    .limit(1);

  if (!session) throw new Error(`Session not found: ${sdkSessionId}`);

  const status = errorMessage ? "FAILED" : "COMPLETED";
  const updates: Record<string, unknown> = { status, endedAt: new Date() };
  if (errorMessage) {
    updates.errorCount = (session.errorCount ?? 0) + 1;
  }

  const [updated] = await db
    .update(copilotSessions)
    .set(updates)
    .where(eq(copilotSessions.id, session.id))
    .returning();

  return toSessionResponse(updated);
}

export async function getSessions(page = 0, size = 20) {
  const offset = page * size;
  const [result, countResult] = await Promise.all([
    db
      .select()
      .from(copilotSessions)
      .orderBy(desc(copilotSessions.createdAt))
      .limit(size)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(copilotSessions),
  ]);

  return {
    content: result.map(toSessionResponse),
    totalElements: Number(countResult[0].count),
    totalPages: Math.ceil(Number(countResult[0].count) / size),
    number: page,
    size,
  };
}

export async function getSessionDetails(sdkSessionId: string): Promise<SessionResponse> {
  const [session] = await db
    .select()
    .from(copilotSessions)
    .where(eq(copilotSessions.sdkSessionId, sdkSessionId))
    .limit(1);
  if (!session) throw new Error(`Session not found: ${sdkSessionId}`);
  return toSessionResponse(session);
}

export async function getSessionOperations(sessionId: string): Promise<OperationResponse[]> {
  const ops = await db
    .select()
    .from(copilotOperations)
    .where(eq(copilotOperations.sessionId, sessionId))
    .orderBy(copilotOperations.timestamp);
  return ops.map(toOperationResponse);
}

export async function deleteSession(sdkSessionId: string): Promise<void> {
  const [session] = await db
    .select()
    .from(copilotSessions)
    .where(eq(copilotSessions.sdkSessionId, sdkSessionId))
    .limit(1);
  if (session) {
    await db.delete(copilotOperations).where(eq(copilotOperations.sessionId, session.id));
    await db.delete(copilotSessions).where(eq(copilotSessions.id, session.id));
  }
}

// ── Operations ──────────────────────────────────────────────────

export async function createOperation(req: CreateOperationRequest): Promise<OperationResponse> {
  const [op] = await db
    .insert(copilotOperations)
    .values({
      sessionId: req.sessionId,
      taskId: req.taskId,
      operationType: req.operationType,
      model: req.model,
      message: req.message,
      details: req.details,
      toolName: req.toolName,
      inputTokens: req.inputTokens,
      outputTokens: req.outputTokens,
      durationMs: req.durationMs,
      success: req.success ?? true,
      errorMessage: req.errorMessage,
      source: req.source ?? "web",
      clientInfo: req.clientInfo,
    })
    .returning();

  // Update session aggregates if linked to a session
  if (req.sessionId) {
    await updateSessionAggregates(req.sessionId);
  }

  return toOperationResponse(op);
}

export async function batchCreateOperations(
  operations: CreateOperationRequest[],
): Promise<OperationResponse[]> {
  if (operations.length === 0) return [];

  const ops = await db
    .insert(copilotOperations)
    .values(
      operations.map((req) => ({
        sessionId: req.sessionId,
        taskId: req.taskId,
        operationType: req.operationType,
        model: req.model,
        message: req.message,
        details: req.details,
        toolName: req.toolName,
        inputTokens: req.inputTokens,
        outputTokens: req.outputTokens,
        durationMs: req.durationMs,
        success: req.success ?? true,
        errorMessage: req.errorMessage,
        source: req.source ?? "web",
        clientInfo: req.clientInfo,
      })),
    )
    .returning();

  // Update session aggregates for affected sessions
  const sessionIds = [...new Set(operations.filter((o) => o.sessionId).map((o) => o.sessionId!))];
  await Promise.all(sessionIds.map(updateSessionAggregates));

  return ops.map(toOperationResponse);
}

async function updateSessionAggregates(sessionId: string): Promise<void> {
  const [agg] = await db
    .select({
      totalOps: sql<number>`count(*)`,
      totalInput: sql<number>`coalesce(sum(${copilotOperations.inputTokens}), 0)`,
      totalOutput: sql<number>`coalesce(sum(${copilotOperations.outputTokens}), 0)`,
      totalDur: sql<number>`coalesce(sum(${copilotOperations.durationMs}), 0)`,
      msgCount: sql<number>`count(*) filter (where ${copilotOperations.operationType} in ('SEND_MESSAGE', 'RECEIVE_MESSAGE'))`,
      toolCount: sql<number>`count(*) filter (where ${copilotOperations.operationType} = 'TOOL_EXECUTION')`,
      errCount: sql<number>`count(*) filter (where ${copilotOperations.success} = false)`,
    })
    .from(copilotOperations)
    .where(eq(copilotOperations.sessionId, sessionId));

  await db
    .update(copilotSessions)
    .set({
      totalInputTokens: Number(agg.totalInput),
      totalOutputTokens: Number(agg.totalOutput),
      messageCount: Number(agg.msgCount),
      toolExecutionCount: Number(agg.toolCount),
      errorCount: Number(agg.errCount),
    })
    .where(eq(copilotSessions.id, sessionId));
}

export async function getOperations(page = 0, size = 20) {
  const offset = page * size;
  const [result, countResult] = await Promise.all([
    db
      .select()
      .from(copilotOperations)
      .orderBy(desc(copilotOperations.timestamp))
      .limit(size)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(copilotOperations),
  ]);

  return {
    content: result.map(toOperationResponse),
    totalElements: Number(countResult[0].count),
    totalPages: Math.ceil(Number(countResult[0].count) / size),
    number: page,
    size,
  };
}

// ── Dashboard ───────────────────────────────────────────────────

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [totalSessionsResult, activeSessionsResult, totalOpsResult, recentSessions] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(copilotSessions),
      db
        .select({ count: sql<number>`count(*)` })
        .from(copilotSessions)
        .where(eq(copilotSessions.status, "ACTIVE")),
      db.select({ count: sql<number>`count(*)` }).from(copilotOperations),
      db
        .select()
        .from(copilotSessions)
        .orderBy(desc(copilotSessions.createdAt))
        .limit(10),
    ]);

  return {
    totalSessions: Number(totalSessionsResult[0].count),
    activeSessions: Number(activeSessionsResult[0].count),
    totalOperations: Number(totalOpsResult[0].count),
    recentSessions: recentSessions.map(toSessionResponse),
  };
}
