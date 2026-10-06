import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword } from "@/lib/auth";
import { ADMIN_COOKIE_NAME, createSessionCookieValue, SESSION_TTL_MS } from "@/lib/session";

export async function POST(req: NextRequest) {
  let password = "";
  try {
    const body = await req.json();
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!password || !checkAdminPassword(password)) {
    // Mensaje genérico a propósito: no revelamos si la contraseña es
    // incorrecta por longitud, formato, etc.
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const cookieValue = await createSessionCookieValue();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
