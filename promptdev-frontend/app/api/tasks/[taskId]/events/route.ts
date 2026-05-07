import { NextRequest, NextResponse } from "next/server";
import * as taskService from "@/lib/services/task-service";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { taskId } = await params;
  const events = await taskService.getTaskEvents(taskId);
  return NextResponse.json(events);
}
