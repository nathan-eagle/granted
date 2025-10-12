import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "granted_session_id";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;
const SESSION_HEADER = "x-granted-session";

export function middleware(request: NextRequest) {
  const responseHeaders = new Headers(request.headers);
  const cookie = request.cookies.get(SESSION_COOKIE);

  if (!cookie) {
    const sessionId = crypto.randomUUID();
    responseHeaders.set(SESSION_HEADER, sessionId);
    const response = NextResponse.next({
      request: {
        headers: responseHeaders,
      },
    });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionId,
      path: "/",
      maxAge: THIRTY_DAYS_SECONDS,
      sameSite: "lax",
    });
    return response;
  }

  // Pass through existing cookie so downstream can reuse it.
  responseHeaders.set(SESSION_HEADER, cookie.value);
  return NextResponse.next({
    request: {
      headers: responseHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
