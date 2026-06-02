import { NextResponse } from "next/server";
import * as bitbucketService from "@/lib/services/bitbucket-service";
import { requireAuth } from "@/lib/auth-guard";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const projects = await bitbucketService.listProjects();
  return NextResponse.json(projects);
}
