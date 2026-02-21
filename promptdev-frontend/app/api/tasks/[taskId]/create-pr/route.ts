import { NextRequest, NextResponse } from "next/server";
import * as taskService from "@/lib/services/task-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  const body = await request.json();
  try {
    const result = await taskService.createPullRequestForTask(
      taskId,
      body.branchName,
      body.targetBranch,
      body.title,
      body.description,
    );
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "PR creation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
