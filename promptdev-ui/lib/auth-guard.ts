/**
 * Authentication guard for API route handlers.
 * PRD-01: Every route handler must verify an authenticated session.
 * PRD-02: Ownership checks for user/task resources.
 */
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

interface AuthResult {
  session: Session;
  error?: never;
}

interface AuthError {
  session?: never;
  error: NextResponse;
}

/**
 * Verify the request has an authenticated session.
 * Returns the session or an HTTP 401 response.
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session };
}

/**
 * Ensure the authenticated user exists in the database.
 * If the user was deleted (e.g. DB cleanup/migration) but their JWT is still valid,
 * re-create the user record with the same UUID to avoid FK constraint violations.
 */
export async function ensureUserExists(session: Session): Promise<string> {
  const userId = session.user?.id;
  if (!userId) throw new Error("No user ID in session");

  const { getDb } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const [existing] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing) return existing.id;

  // User was deleted — re-create with the same UUID so existing FK references stay valid
  const sessionExt = session.user as Record<string, unknown>;
  const [newUser] = await getDb()
    .insert(users)
    .values({
      id: userId,
      provider: (sessionExt.provider as string) || "unknown",
      providerAccountId: userId,
      email: session.user?.email || "",
      name: session.user?.name || undefined,
      avatarUrl: session.user?.image || undefined,
    })
    .onConflictDoNothing()
    .returning();

  return newUser?.id ?? userId;
}

/**
 * Verify that the authenticated user owns the resource identified by userId.
 * Returns HTTP 403 if the user does not own the resource.
 */
export function requireOwnership(
  session: Session,
  resourceUserId: string,
): NextResponse | null {
  if (session.user?.id !== resourceUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Verify that the authenticated user owns the task.
 * Queries the tasks table directly and returns 404 if not found, 403 if not owned.
 * Tasks with no userId (e.g. scheduled jobs) are accessible by any authenticated user.
 */
export async function requireTaskOwnership(
  session: Session,
  taskId: string,
): Promise<NextResponse | null> {
  const { getDb } = await import("@/lib/db");
  const { tasks } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const [task] = await getDb()
    .select({ userId: tasks.userId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.userId && task.userId !== session.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
