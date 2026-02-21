import { NextRequest, NextResponse } from "next/server";
import * as taskService from "@/lib/services/task-service";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? 0);
  const size = Number(searchParams.get("size") ?? 20);
  const status = searchParams.get("status");

  if (status) {
    // Filter by status — used by scheduled-task-executor
    const result = await taskService.getAllTasks(0, Number(searchParams.get("size") ?? 50));
    const filtered = result.content.filter((t) => t.status === status);
    return NextResponse.json({ content: filtered, totalElements: filtered.length });
  }

  const result = await taskService.getAllTasks(page, size);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const task = await taskService.createTask(body);
  return NextResponse.json(task, { status: 201 });
}
