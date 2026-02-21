import { NextRequest, NextResponse } from "next/server";
import * as userService from "@/lib/services/user-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  try {
    const profile = await userService.getUserProfile(userId);
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
