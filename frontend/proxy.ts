import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isJwtExpired } from "@/app/utils/auth";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token || isJwtExpired(token)) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/eventos/:path*",
    "/personas/:path*",
    "/calendario/:path*",
  ],
};
