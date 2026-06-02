import { NextRequest, NextResponse } from "next/server";
import * as scheduledJobService from "@/lib/services/scheduled-job-service";
import { requireAuth } from "@/lib/auth-guard";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const jobs = await scheduledJobService.getAllJobs();
  return NextResponse.json(jobs);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const job = await scheduledJobService.createJob(body);
  return NextResponse.json(job, { status: 201 });
}
