import { NextRequest, NextResponse } from "next/server";
import * as userService from "@/lib/services/user-service";
import { requireAuth, requireOwnership } from "@/lib/auth-guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { userId } = await params;
  const ownershipError = requireOwnership(session, userId);
  if (ownershipError) return ownershipError;
  try {
    const profile = await userService.getUserProfile(userId);
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
