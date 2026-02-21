import { NextRequest, NextResponse } from "next/server";
import * as jiraService from "@/lib/services/jira-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> },
) {
  const { issueKey } = await params;
  const issue = await jiraService.getIssue(issueKey);
  return NextResponse.json(issue);
}
