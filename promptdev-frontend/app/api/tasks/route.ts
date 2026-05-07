import { NextRequest, NextResponse } from "next/server";
import * as taskService from "@/lib/services/task-service";
import { requireAuth, ensureUserExists } from "@/lib/auth-guard";
import { STATUS_GROUPS } from "@/lib/task-statuses";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? 0);
  const size = Number(searchParams.get("size") ?? 20);
  const statusFilter = searchParams.get("status");
  const search = searchParams.get("search") || undefined;
  const workspaceType = searchParams.get("workspaceType") || undefined;

  let statuses: string[] | undefined;
  if (statusFilter && statusFilter !== "all") {
    // Check if it matches a group label
    const group = STATUS_GROUPS.find((g) => g.label === statusFilter);
    if (group) {
      statuses = group.statuses;
    } else {
      // Fallback: assume it's a single status or comma-separated
      statuses = statusFilter.split(",").map((s) => s.trim());
    }
  }

  const result = await taskService.getAllTasks(page, size, {
    search,
    statuses,
    workspaceType: workspaceType === "all" ? undefined : workspaceType,
  });

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
