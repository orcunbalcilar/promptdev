import { NextRequest, NextResponse } from "next/server";
import * as jiraService from "@/lib/services/jira-service";

export async function GET(request: NextRequest) {
  const jql = request.nextUrl.searchParams.get("jql") ?? "";
  const maxResults = Number(request.nextUrl.searchParams.get("maxResults") ?? 50);
  const result = await jiraService.searchIssues(jql, maxResults);
  return NextResponse.json(result);
}
