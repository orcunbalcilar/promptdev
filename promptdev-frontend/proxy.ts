import { auth } from "@/auth"

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  // Public routes that don't require authentication
  const publicPaths = ["/login", "/api/auth", "/api/copilot/models"]
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  )

  if (isPublic) return

  // Redirect unauthenticated users to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return Response.redirect(loginUrl)
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|api/copilot/models).*)"],
}
