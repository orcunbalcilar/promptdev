/**
 * CSRF protection using double-submit cookie pattern.
 * PRD-03: Validate CSRF token on all state-changing requests.
 *
 * NextAuth sets a `next-auth.csrf-token` cookie containing `token|hash`.
 * Frontend sends the raw token in the `x-csrf-token` header.
 * This function compares the two to prevent cross-site request forgery.
 */
import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Routes exempt from CSRF validation (server-initiated or auth flows) */
const EXEMPT_PATHS = [
  "/api/auth/",
  "/api/health",
  "/api/stream/callback",
];

/**
 * Validate the CSRF token on a state-changing request.
 * Returns a 403 NextResponse if invalid, or null if valid/exempt.
 */
export function validateCsrf(request: NextRequest): NextResponse | null {
  // Safe methods don't modify state — skip
  if (SAFE_METHODS.has(request.method)) return null;

  // Check exempt paths
  const pathname = request.nextUrl.pathname;
  if (EXEMPT_PATHS.some((p) => pathname.startsWith(p))) return null;

  // In non-production, skip CSRF for easier development/testing
  if (process.env.NODE_ENV !== "production") return null;

  const cookieValue = request.cookies.get("next-auth.csrf-token")?.value
    ?? request.cookies.get("__Host-next-auth.csrf-token")?.value;
  const cookieToken = cookieValue?.split("|")[0];
  const headerToken = request.headers.get("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json(
      { error: "CSRF validation failed" },
      { status: 403 },
    );
  }

  return null;
}
