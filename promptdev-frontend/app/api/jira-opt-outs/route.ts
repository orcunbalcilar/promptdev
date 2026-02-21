import { NextRequest, NextResponse } from "next/server";
import * as optOutService from "@/lib/services/jira-opt-out-service";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Check for single issue opt-out
  const issueKey = request.nextUrl.searchParams.get("issueKey");
  if (issueKey) {
    const opted = await optOutService.isOptedOut(userId, issueKey);
    return NextResponse.json({ optedOut: opted });
  }

  const optOuts = await optOutService.getOptOutsForUser(userId);
  return NextResponse.json(optOuts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const optOut = await optOutService.createOptOut(
    body.userId,
    body.jiraIssueKey,
    body.reason,
  );
  return NextResponse.json(optOut, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") ?? "";
  const issueKey = request.nextUrl.searchParams.get("issueKey") ?? "";
  await optOutService.deleteOptOut(userId, issueKey);
  return new NextResponse(null, { status: 204 });
}
