import { Header } from "@/components/layout/header";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import * as taskService from "@/lib/services/task-service";
import { STATUS_GROUPS } from "@/lib/task-statuses";
import type { Task } from "@/lib/api";

// Force dynamic rendering since we read search params and DB
export const dynamic = 'force-dynamic';

function adaptTask(t: taskService.TaskResponse): Task {
  return {
    ...t,
    prompt: t.prompt ?? "",
    sourceBranch: t.sourceBranch ?? "",
    targetBranch: t.targetBranch ?? "",
    updatedAt: t.updatedAt ?? new Date().toISOString(),
    projectKey: t.projectKey ?? undefined,
    workspacePath: t.workspacePath ?? undefined,
    modelId: t.modelId ?? undefined,
    copilotSessionId: t.copilotSessionId ?? undefined,
    pullRequestId: t.pullRequestId ?? undefined,
    pullRequestUrl: t.pullRequestUrl ?? undefined,
    errorMessage: t.errorMessage ?? undefined,
    iterative: t.iterative ?? undefined,
    maxIterations: t.maxIterations ?? undefined,
    currentIteration: t.currentIteration ?? undefined,
    currentStepIndex: t.currentStepIndex ?? undefined,
    completionCriteria: t.completionCriteria ?? undefined,
    steps: t.steps ?? undefined,
    scheduledJobId: t.scheduledJobId ?? undefined,
    jiraIssueKey: t.jiraIssueKey ?? undefined,
    reviewEnabled: t.reviewEnabled ?? undefined,
    reviewModelId: t.reviewModelId ?? undefined,
    resumePrompt: t.resumePrompt ?? undefined,
    resumeCount: t.resumeCount ?? undefined,
    commitMessagePattern: t.commitMessagePattern ?? undefined,
    bootScript: t.bootScript ?? undefined,
    skills: t.skills ?? undefined,
    additionalRepositories: t.additionalRepositories ?? undefined,
    systemPrompt: t.systemPrompt ?? undefined,
    completedAt: t.completedAt ?? undefined,
  } as Task;
}

export default async function Page({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page ?? 0);
  const size = Number(resolvedSearchParams.size ?? 100);
  const statusFilter = resolvedSearchParams.status as string | undefined;
  const search = resolvedSearchParams.search as string | undefined;
  const workspaceType = resolvedSearchParams.workspaceType as string | undefined;

  let statuses: string[] | undefined;
  if (statusFilter && statusFilter !== "all") {
    const group = STATUS_GROUPS.find((g) => g.label === statusFilter);
    if (group) {
      statuses = group.statuses;
    } else {
      statuses = statusFilter.split(",").map((s) => s.trim());
    }
  }

  // Fetch initial data on server
  let initialTasks;
  try {
    const result = await taskService.getAllTasks(page, size, {
      search,
      statuses,
      workspaceType: workspaceType === "all" ? undefined : workspaceType,
    });
    initialTasks = {
      ...result,
      content: result.content.map(adaptTask),
    };
  } catch (e) {
    console.error("Failed to fetch initial tasks:", e);
    // Fallback to empty or let client fetch
    initialTasks = undefined;
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-background flex flex-col">
      <Header />
      <main className="flex-1 lg:overflow-hidden">
        <DashboardView initialTasks={initialTasks} />
      </main>
    </div>
  );
}
