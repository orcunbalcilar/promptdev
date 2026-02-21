import { NextRequest, NextResponse } from "next/server";
import * as userService from "@/lib/services/user-service";

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const provider = searchParams.get("provider") ?? "";
  const providerAccountId = searchParams.get("providerAccountId") ?? "";
  const email = searchParams.get("email") ?? "";
  const name = searchParams.get("name") ?? undefined;
  const avatarUrl = searchParams.get("avatarUrl") ?? undefined;

  const profile = await userService.findOrCreateUser(
    provider,
    providerAccountId,
    email,
    name,
    avatarUrl,
  );
  return NextResponse.json(profile);
}
