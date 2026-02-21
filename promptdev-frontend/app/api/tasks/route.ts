import { NextRequest, NextResponse } from "next/server";
import * as taskService from "@/lib/services/task-service";
import { requireAuth, ensureUserExists } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? 0);
  const size = Number(searchParams.get("size") ?? 20);
  const status = searchParams.get("status");

  const result = await taskService.getAllTasks(page, size);

  if (status) {
    const filtered = result.content.filter((t) => t.status === status);
    return NextResponse.json({ ...result, content: filtered, totalElements: filtered.length });
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();

  // Ensure user exists in DB (handles stale JWT tokens after DB cleanup/migration)
  const userId = await ensureUserExists(session);

  const task = await taskService.createTask({ ...body, userId });
  return NextResponse.json(task, { status: 201 });
}
