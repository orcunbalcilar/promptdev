import { NextRequest, NextResponse } from "next/server";
import * as jiraService from "@/lib/services/jira-service";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectKey: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { projectKey } = await params;
  const maxResults = Number(
    request.nextUrl.searchParams.get("maxResults") ?? 50,
  );
  const result = await jiraService.getIssuesByProject(projectKey, maxResults);
  return NextResponse.json(result);
}
