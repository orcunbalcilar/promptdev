import { NextRequest, NextResponse } from "next/server";
import * as jiraService from "@/lib/services/jira-service";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { issueKey } = await params;
  const transitions = await jiraService.getTransitions(issueKey);
  return NextResponse.json({ transitions });
}
