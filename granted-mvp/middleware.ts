import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "granted_session_id";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)) {
    response.cookies.set({
      name: SESSION_COOKIE,
      value: crypto.randomUUID(),
      path: "/",
      maxAge: THIRTY_DAYS_SECONDS,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
