import { NextRequest, NextResponse } from "next/server";
import * as bitbucketService from "@/lib/services/bitbucket-service";

export async function GET(request: NextRequest) {
  const projectKey = request.nextUrl.searchParams.get("projectKey");
  const repos = projectKey
    ? await bitbucketService.listRepositories(projectKey)
    : await bitbucketService.listAllRepositories();
  return NextResponse.json(repos);
}
