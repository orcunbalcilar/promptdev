import { NextRequest, NextResponse } from "next/server";
import * as jiraService from "@/lib/services/jira-service";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const jql = request.nextUrl.searchParams.get("jql") ?? "";
  const maxResults = Number(
    request.nextUrl.searchParams.get("maxResults") ?? 50,
  );
  const result = await jiraService.searchIssues(jql, maxResults);
  return NextResponse.json(result);
}
