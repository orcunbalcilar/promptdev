import { NextRequest, NextResponse } from "next/server";
import * as workspaceService from "@/lib/services/workspace-service";
import * as bitbucketService from "@/lib/services/bitbucket-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  const body = await request.json();
  try {
    const cloneUrl = bitbucketService.getCloneUrl(
      body.projectKey,
      body.repoSlug,
    );
    const path = workspaceService.cloneRepository(
      taskId,
      cloneUrl,
      body.username,
      body.token,
      body.sourceBranch,
    );
    return NextResponse.json({ path });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Clone failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
