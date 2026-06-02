import { NextRequest, NextResponse } from "next/server";
import * as workspaceService from "@/lib/services/workspace-service";
import * as taskService from "@/lib/services/task-service";
import { requireAuth } from "@/lib/auth-guard";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { taskId } = await params;
  try {
    const task = await taskService.getTask(taskId);
    let path: string;
    if (task.workspaceType === "LOCAL" && task.workspacePath) {
      path = workspaceService.createLocalWorkspace(task.workspacePath);
    } else {
      path = workspaceService.createWorkspace(taskId);
    }
    return NextResponse.json({ path });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Workspace creation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { taskId } = await params;
  workspaceService.cleanupWorkspace(taskId);
  return new NextResponse(null, { status: 204 });
}
