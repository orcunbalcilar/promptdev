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
  const filterText =
    request.nextUrl.searchParams.get("filterText") ?? undefined;
  const branches = await bitbucketService.listBranches(
    projectKey,
    slug,
    filterText,
  );
  return NextResponse.json(branches);
}
