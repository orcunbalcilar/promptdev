import { NextRequest, NextResponse } from "next/server";
import * as scheduledJobService from "@/lib/services/scheduled-job-service";
import * as taskService from "@/lib/services/task-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const job = await scheduledJobService.getJob(id);

    // Create a task from the job template
    const task = await taskService.createTask({
      title: `[Scheduled] ${job.name}`,
      prompt: job.promptTemplate,
      repositorySlug: job.workspaceRef,
      projectKey: job.projectKey ?? undefined,
      workspaceType: job.workspaceType,
      sourceBranch: job.sourceBranch ?? "main",
      targetBranch: job.targetBranch ?? "main",
      modelId: job.modelId ?? "gpt-5.2",
      iterative: true,
      maxIterations: job.maxIterations ?? 10,
    });

    // Link the task to the scheduled job
    await scheduledJobService.markJobRun(id, task.id);

    // Start the task
    await taskService.startTask(task.id);

    return NextResponse.json(task, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Run failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
