import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "granted_session_id";
const PROJECT_COOKIE = "granted_project_id";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;
const SESSION_HEADER = "x-granted-session";
const PROJECT_HEADER = "x-granted-project";

export function middleware(request: NextRequest) {
  const responseHeaders = new Headers(request.headers);
  const cookie = request.cookies.get(SESSION_COOKIE);
  const projectCookie = request.cookies.get(PROJECT_COOKIE);

  if (!cookie) {
    const sessionId = crypto.randomUUID();
    responseHeaders.set(SESSION_HEADER, sessionId);
    if (projectCookie) {
      responseHeaders.set(PROJECT_HEADER, projectCookie.value);
    }
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
  if (projectCookie) {
    responseHeaders.set(PROJECT_HEADER, projectCookie.value);
  }
  return NextResponse.next({
    request: {
      headers: responseHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
