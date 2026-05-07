import { NextRequest, NextResponse } from "next/server";
import * as scheduledJobService from "@/lib/services/scheduled-job-service";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  try {
    const job = await scheduledJobService.getJob(id);
    return NextResponse.json(job);
  } catch {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  await scheduledJobService.deleteJob(id);
  return new NextResponse(null, { status: 204 });
}
