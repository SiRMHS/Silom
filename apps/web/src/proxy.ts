import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic gate for /admin.
 *
 * This only checks that a session cookie exists — it never touches the
 * database, per the Proxy guidance. The authoritative check (is the session
 * real, unexpired, and an admin?) lives in `requireAdmin()`, which every admin
 * page and server action calls.
 */

const SESSION_COOKIE = "rahyad_session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isLogin = pathname === "/admin/login";
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession && !isLogin) {
    const url = new URL("/admin/login", request.url);
    if (pathname !== "/admin") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (hasSession && isLogin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
