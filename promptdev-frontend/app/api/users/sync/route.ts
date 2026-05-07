import { NextRequest, NextResponse } from "next/server";
import * as userService from "@/lib/services/user-service";
import { requireAuth } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const provider = searchParams.get("provider") ?? "";
  const providerAccountId = searchParams.get("providerAccountId") ?? "";
  const email = searchParams.get("email") ?? "";
  const name = searchParams.get("name") ?? undefined;
  const avatarUrl = searchParams.get("avatarUrl") ?? undefined;

  const user = await userService.findOrCreateUser(
    provider,
    providerAccountId,
    email,
    name,
    avatarUrl,
  );
  // Return the proper UserProfileDto (with computed flags like bitbucketTokenSet)
  const profile = await userService.getUserProfile(user.id);
  return NextResponse.json(profile);
}
