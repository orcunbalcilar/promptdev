import { NextRequest, NextResponse } from "next/server";
import * as userService from "@/lib/services/user-service";
import { requireAuth, requireOwnership } from "@/lib/auth-guard";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { userId } = await params;
  const ownershipError = requireOwnership(session, userId);
  if (ownershipError) return ownershipError;
  const body = await request.json();
  try {
    const profile = await userService.updateSettings(userId, body);
    return NextResponse.json(profile);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
