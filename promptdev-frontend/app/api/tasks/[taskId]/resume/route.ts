import { NextRequest, NextResponse } from "next/server";
import * as taskService from "@/lib/services/task-service";
import { requireAuth, requireTaskOwnership } from "@/lib/auth-guard";

export async function POST(
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
    const task = await taskService.resumeTask(taskId, body.resumePrompt);
    return NextResponse.json(task);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Resume failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
