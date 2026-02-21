import { NextRequest, NextResponse } from "next/server";
import * as jiraService from "@/lib/services/jira-service";
import { requireAuth } from "@/lib/auth-guard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { issueKey } = await params;
  const body = await request.json();
  await jiraService.transitionIssue(issueKey, body.transitionId);
  return NextResponse.json({ success: true });
}
