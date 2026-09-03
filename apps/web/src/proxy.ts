import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Keep login page always accessible so the user can recover the session.
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // if (pathname === "/") {
  //   const hasSession = request.cookies.has("access_token");
  //   if (!hasSession) {
  //     const loginUrl = new URL("/login", request.url);
  //     return NextResponse.redirect(loginUrl);
  //   }
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login"],
};