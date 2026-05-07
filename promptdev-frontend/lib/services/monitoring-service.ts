/**
 * Monitoring service — session and operation tracking for Copilot agent monitoring.
 */
import { getDb } from "../db";
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
  totalErrors: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  operationsByType: Record<string, number>;
  sessionsByModel: Record<string, number>;
  sessionsBySource: Record<string, number>;
  topTools: Array<{ toolName: string; executionCount: number; avgDurationMs: number }>;
  dailyOperations: Array<{ date: string; count: number }>;
  recentErrors: Array<{
    id: string;
    operationType: string;
    message: string;
    errorMessage: string;
    timestamp: string;
    sessionId: string;
  }>;
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
    /* v8 ignore next — toISOString() always returns truthy string, so ?? null right side is unreachable when ?. succeeds */
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
  const [session] = await getDb()
    .insert(copilotSessions)
    .values({
      sdkSessionId: req.sdkSessionId,
      taskId: req.taskId,
      model: req.model,
      reasoningEffort: req.reasoningEffort,
      status: "ACTIVE",
      source: req.source ?? "web",
      createdAt: new Date(),
    })
    .returning();
  return toSessionResponse(session);
}

export async function endSession(
  sdkSessionId: string,
  errorMessage?: string,
): Promise<SessionResponse> {
  const [session] = await getDb()
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

  const [updated] = await getDb()
    .update(copilotSessions)
    .set(updates)
    .where(eq(copilotSessions.id, session.id))
    .returning();

  return toSessionResponse(updated);
}

export async function getSessions(page = 0, size = 20) {
  const offset = page * size;
  const [result, countResult] = await Promise.all([
    getDb()
      .select()
      .from(copilotSessions)
      .orderBy(desc(copilotSessions.createdAt))
      .limit(size)
      .offset(offset),
    getDb().select({ count: sql<number>`count(*)` }).from(copilotSessions),
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
  const [session] = await getDb()
    .select()
    .from(copilotSessions)
    .where(eq(copilotSessions.sdkSessionId, sdkSessionId))
    .limit(1);
  if (!session) throw new Error(`Session not found: ${sdkSessionId}`);
  return toSessionResponse(session);
}

export async function getSessionOperations(sessionId: string): Promise<OperationResponse[]> {
  const ops = await getDb()
    .select()
    .from(copilotOperations)
    .where(eq(copilotOperations.sessionId, sessionId))
    .orderBy(copilotOperations.timestamp);
  return ops.map(toOperationResponse);
}

export async function deleteSession(sdkSessionId: string): Promise<void> {
  const [session] = await getDb()
    .select()
    .from(copilotSessions)
    .where(eq(copilotSessions.sdkSessionId, sdkSessionId))
    .limit(1);
  if (session) {
    await getDb().delete(copilotOperations).where(eq(copilotOperations.sessionId, session.id));
    await getDb().delete(copilotSessions).where(eq(copilotSessions.id, session.id));
  }
}

// ── Operations ──────────────────────────────────────────────────

export async function createOperation(req: CreateOperationRequest): Promise<OperationResponse> {
  const [op] = await getDb()
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
      timestamp: new Date(),
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

  const now = new Date();
  const ops = await getDb()
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
        timestamp: now,
      })),
    )
    .returning();

  // Update session aggregates for affected sessions
  const sessionIds = [...new Set(operations.filter((o) => o.sessionId).map((o) => o.sessionId!))];
  await Promise.all(sessionIds.map(updateSessionAggregates));

  return ops.map(toOperationResponse);
}

async function updateSessionAggregates(sessionId: string): Promise<void> {
  const [agg] = await getDb()
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

  await getDb()
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
    getDb()
      .select()
      .from(copilotOperations)
      .orderBy(desc(copilotOperations.timestamp))
      .limit(size)
      .offset(offset),
    getDb().select({ count: sql<number>`count(*)` }).from(copilotOperations),
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

export async function getDashboardMetrics(days = 7): Promise<DashboardMetrics> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const db = getDb();

  const [
    totalSessionsResult,
    activeSessionsResult,
    totalOpsResult,
    recentSessions,
    tokenAgg,
    errorCountResult,
    opsByType,
    sessionsByModel,
    sessionsBySource,
    topToolsResult,
    dailyOpsResult,
    recentErrorsResult,
  ] = await Promise.all([
    // Total sessions in time range
    db
      .select({ count: sql<number>`count(*)` })
      .from(copilotSessions)
      .where(sql`${copilotSessions.createdAt} >= ${cutoff}`),

    // Active sessions
    db
      .select({ count: sql<number>`count(*)` })
      .from(copilotSessions)
      .where(eq(copilotSessions.status, "ACTIVE")),

    // Total operations in time range
    db
      .select({ count: sql<number>`count(*)` })
      .from(copilotOperations)
      .where(sql`${copilotOperations.timestamp} >= ${cutoff}`),

    // Recent sessions
    db
      .select()
      .from(copilotSessions)
      .orderBy(desc(copilotSessions.createdAt))
      .limit(10),

    // Aggregate token usage in time range
    db
      .select({
        totalInput: sql<number>`coalesce(sum(${copilotSessions.totalInputTokens}), 0)`,
        totalOutput: sql<number>`coalesce(sum(${copilotSessions.totalOutputTokens}), 0)`,
      })
      .from(copilotSessions)
      .where(sql`${copilotSessions.createdAt} >= ${cutoff}`),

    // Total errors in time range
    db
      .select({ count: sql<number>`count(*)` })
      .from(copilotOperations)
      .where(sql`${copilotOperations.timestamp} >= ${cutoff} AND ${copilotOperations.success} = false`),

    // Operations by type in time range
    db
      .select({
        type: copilotOperations.operationType,
        count: sql<number>`count(*)`,
      })
      .from(copilotOperations)
      .where(sql`${copilotOperations.timestamp} >= ${cutoff}`)
      .groupBy(copilotOperations.operationType),

    // Sessions by model in time range
    db
      .select({
        model: copilotSessions.model,
        count: sql<number>`count(*)`,
      })
      .from(copilotSessions)
      .where(sql`${copilotSessions.createdAt} >= ${cutoff}`)
      .groupBy(copilotSessions.model),

    // Sessions by source in time range
    db
      .select({
        source: copilotSessions.source,
        count: sql<number>`count(*)`,
      })
      .from(copilotSessions)
      .where(sql`${copilotSessions.createdAt} >= ${cutoff}`)
      .groupBy(copilotSessions.source),

    // Top tools by execution count in time range
    db
      .select({
        toolName: copilotOperations.toolName,
        executionCount: sql<number>`count(*)`,
        avgDurationMs: sql<number>`coalesce(avg(${copilotOperations.durationMs}), 0)`,
      })
      .from(copilotOperations)
      .where(
        sql`${copilotOperations.timestamp} >= ${cutoff} AND ${copilotOperations.toolName} IS NOT NULL`,
      )
      .groupBy(copilotOperations.toolName)
      .orderBy(sql`count(*) DESC`)
      .limit(10),

    // Daily operations for chart in time range
    db
      .select({
        date: sql<string>`to_char(${copilotOperations.timestamp}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)`,
      })
      .from(copilotOperations)
      .where(sql`${copilotOperations.timestamp} >= ${cutoff}`)
      .groupBy(sql`to_char(${copilotOperations.timestamp}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${copilotOperations.timestamp}, 'YYYY-MM-DD')`),

    // Recent errors
    db
      .select()
      .from(copilotOperations)
      .where(
        sql`${copilotOperations.timestamp} >= ${cutoff} AND ${copilotOperations.success} = false`,
      )
      .orderBy(desc(copilotOperations.timestamp))
      .limit(20),
  ]);

  // Transform results
  const operationsByType: Record<string, number> = {};
  for (const row of opsByType) {
    operationsByType[row.type] = Number(row.count);
  }

  const sessionsByModelMap: Record<string, number> = {};
  for (const row of sessionsByModel) {
    sessionsByModelMap[row.model] = Number(row.count);
  }

  const sessionsBySourceMap: Record<string, number> = {};
  for (const row of sessionsBySource) {
    if (row.source) {
      sessionsBySourceMap[row.source] = Number(row.count);
    }
  }

  const topTools = topToolsResult.map((row) => ({
    toolName: row.toolName!,
    executionCount: Number(row.executionCount),
    avgDurationMs: Math.round(Number(row.avgDurationMs)),
  }));

  const dailyOperations = dailyOpsResult.map((row) => ({
    date: row.date,
    count: Number(row.count),
  }));

  const recentErrors = recentErrorsResult.map((op) => ({
    id: op.id,
    operationType: op.operationType,
    message: op.message ?? "",
    errorMessage: op.errorMessage ?? "",
    timestamp: op.timestamp.toISOString(),
    sessionId: op.sessionId ?? "",
  }));

  return {
    totalSessions: Number(totalSessionsResult[0].count),
    activeSessions: Number(activeSessionsResult[0].count),
    totalOperations: Number(totalOpsResult[0].count),
    totalErrors: Number(errorCountResult[0].count),
    totalInputTokens: Number(tokenAgg[0].totalInput),
    totalOutputTokens: Number(tokenAgg[0].totalOutput),
    operationsByType,
    sessionsByModel: sessionsByModelMap,
    sessionsBySource: sessionsBySourceMap,
    topTools,
    dailyOperations,
    recentErrors,
    recentSessions: recentSessions.map(toSessionResponse),
  };
}
