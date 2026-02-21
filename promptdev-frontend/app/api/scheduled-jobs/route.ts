import { NextRequest, NextResponse } from "next/server";
import * as scheduledJobService from "@/lib/services/scheduled-job-service";

export async function GET() {
  const jobs = await scheduledJobService.getAllJobs();
  return NextResponse.json(jobs);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const job = await scheduledJobService.createJob(body);
  return NextResponse.json(job, { status: 201 });
}
