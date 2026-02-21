import { NextRequest, NextResponse } from "next/server";
import * as taskService from "@/lib/services/task-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  try {
    const task = await taskService.cloneTask(taskId);
    return NextResponse.json(task, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Clone failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
