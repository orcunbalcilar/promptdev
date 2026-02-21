import { NextRequest, NextResponse } from "next/server";
import * as jiraService from "@/lib/services/jira-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> },
) {
  const { issueKey } = await params;
  const body = await request.json();
  await jiraService.transitionIssue(issueKey, body.transitionId);
  return NextResponse.json({ success: true });
}
