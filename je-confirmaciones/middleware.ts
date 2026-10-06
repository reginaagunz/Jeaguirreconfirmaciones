import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, isValidSessionCookieValue } from "@/lib/session";

// Protege todo lo que esté bajo /admin/dashboard.
// La página /admin (login) y las rutas /api/admin/login|logout quedan libres.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const valid = await isValidSessionCookieValue(cookie);

  if (pathname.startsWith("/admin/dashboard") && !valid) {
    const loginUrl = new URL("/admin", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/api/admin/appointments") && !valid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*", "/api/admin/appointments/:path*"],
};
