import { NextResponse } from "next/server";
import * as bitbucketService from "@/lib/services/bitbucket-service";

export async function GET() {
  const projects = await bitbucketService.listProjects();
  return NextResponse.json(projects);
}
