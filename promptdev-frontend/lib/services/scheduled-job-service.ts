/**
 * Scheduled job service — CRUD and cron-based execution timing.
 */
import { db } from "../db";
import { scheduledJobs, tasks } from "../db/schema";
import { eq, and, lte, desc } from "drizzle-orm";
import CronExpressionParser from "cron-parser";

// ── Types ───────────────────────────────────────────────────────

export interface CreateScheduledJobRequest {
  name: string;
  description?: string;
  cronExpression: string;
  promptTemplate: string;
  jobType?: string;
  workspaceType?: string;
  workspaceRef: string;
  projectKey?: string;
  sourceBranch?: string;
  targetBranch?: string;
  modelId?: string;
  maxIterations?: number;
}

export interface ScheduledJobResponse {
  id: string;
  name: string;
  description: string | null;
  cronExpression: string;
  promptTemplate: string;
  jobType: string;
  workspaceType: string;
  workspaceRef: string;
  projectKey: string | null;
  sourceBranch: string | null;
  targetBranch: string | null;
  modelId: string | null;
  enabled: boolean | null;
  maxIterations: number | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastTaskId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

function toResponse(j: typeof scheduledJobs.$inferSelect): ScheduledJobResponse {
  return {
    id: j.id,
    name: j.name,
    description: j.description,
    cronExpression: j.cronExpression,
    promptTemplate: j.promptTemplate,
    jobType: j.jobType,
    workspaceType: j.workspaceType,
    workspaceRef: j.workspaceRef,
    projectKey: j.projectKey,
    sourceBranch: j.sourceBranch,
    targetBranch: j.targetBranch,
    modelId: j.modelId,
    enabled: j.enabled,
    maxIterations: j.maxIterations,
    lastRunAt: j.lastRunAt?.toISOString() ?? null,
    nextRunAt: j.nextRunAt?.toISOString() ?? null,
    lastTaskId: j.lastTaskId,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt?.toISOString() ?? null,
  };
}

function computeNextRun(cronExpression: string): Date {
  const expr = CronExpressionParser.parse(cronExpression);
  return expr.next().toDate();
}

// ── CRUD ────────────────────────────────────────────────────────

export async function createJob(req: CreateScheduledJobRequest): Promise<ScheduledJobResponse> {
  const nextRun = computeNextRun(req.cronExpression);

  const [job] = await db
    .insert(scheduledJobs)
    .values({
      name: req.name,
      description: req.description,
      cronExpression: req.cronExpression,
      promptTemplate: req.promptTemplate,
      jobType: req.jobType ?? "MAINTENANCE",
      workspaceType: req.workspaceType ?? "BITBUCKET",
      workspaceRef: req.workspaceRef,
      projectKey: req.projectKey,
      sourceBranch: req.sourceBranch ?? "main",
      targetBranch: req.targetBranch ?? "main",
      modelId: req.modelId ?? "gpt-5.2",
      maxIterations: req.maxIterations ?? 10,
      enabled: true,
      nextRunAt: nextRun,
    })
    .returning();

  return toResponse(job);
}

export async function getJob(id: string): Promise<ScheduledJobResponse> {
  const [job] = await db.select().from(scheduledJobs).where(eq(scheduledJobs.id, id)).limit(1);
  if (!job) throw new Error(`Scheduled job not found: ${id}`);
  return toResponse(job);
}

export async function getAllJobs(): Promise<ScheduledJobResponse[]> {
  const result = await db
    .select()
    .from(scheduledJobs)
    .orderBy(desc(scheduledJobs.createdAt));
  return result.map(toResponse);
}

export async function deleteJob(id: string): Promise<void> {
  await db.delete(scheduledJobs).where(eq(scheduledJobs.id, id));
}

export async function toggleJob(id: string): Promise<ScheduledJobResponse> {
  const [job] = await db.select().from(scheduledJobs).where(eq(scheduledJobs.id, id)).limit(1);
  if (!job) throw new Error(`Scheduled job not found: ${id}`);

  const newEnabled = !job.enabled;
  const nextRun = newEnabled ? computeNextRun(job.cronExpression) : null;

  const [updated] = await db
    .update(scheduledJobs)
    .set({ enabled: newEnabled, nextRunAt: nextRun })
    .where(eq(scheduledJobs.id, id))
    .returning();

  return toResponse(updated);
}

// ── Execution ───────────────────────────────────────────────────

export async function getDueJobs(): Promise<ScheduledJobResponse[]> {
  const now = new Date();
  const result = await db
    .select()
    .from(scheduledJobs)
    .where(
      and(
        eq(scheduledJobs.enabled, true),
        lte(scheduledJobs.nextRunAt, now),
      ),
    );
  return result.map(toResponse);
}

export async function markJobRun(
  jobId: string,
  taskId: string,
): Promise<ScheduledJobResponse> {
  const [job] = await db.select().from(scheduledJobs).where(eq(scheduledJobs.id, jobId)).limit(1);
  if (!job) throw new Error(`Scheduled job not found: ${jobId}`);

  const nextRun = computeNextRun(job.cronExpression);

  const [updated] = await db
    .update(scheduledJobs)
    .set({
      lastRunAt: new Date(),
      nextRunAt: nextRun,
      lastTaskId: taskId,
    })
    .where(eq(scheduledJobs.id, jobId))
    .returning();

  return toResponse(updated);
}

export async function getJobHistory(jobId: string) {
  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.scheduledJobId, jobId))
    .orderBy(desc(tasks.createdAt))
    .limit(50);

  return result.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt?.toISOString() ?? null,
  }));
}
