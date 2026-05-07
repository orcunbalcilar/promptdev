import { NextRequest, NextResponse } from "next/server";
import * as taskService from "@/lib/services/task-service";
import { requireAuth, requireTaskOwnership } from "@/lib/auth-guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { taskId } = await params;
  try {
    const task = await taskService.getTask(taskId);
    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { taskId } = await params;
  const ownershipError = await requireTaskOwnership(session, taskId);
  if (ownershipError) return ownershipError;
  const body = await request.json();
  try {
    const task = await taskService.updateTask(taskId, body);
    return NextResponse.json(task);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
