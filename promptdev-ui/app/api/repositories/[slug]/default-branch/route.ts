import { NextRequest, NextResponse } from "next/server";
import * as bitbucketService from "@/lib/services/bitbucket-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const projectKey = request.nextUrl.searchParams.get("projectKey");
  if (!projectKey) {
    return NextResponse.json(
      { error: "projectKey is required" },
      { status: 400 },
    );
  }
  try {
    const branch = await bitbucketService.getDefaultBranch(projectKey, slug);
    return NextResponse.json(branch);
  } catch {
    return NextResponse.json(
      { error: "Default branch not found" },
      { status: 404 },
    );
  }
}
