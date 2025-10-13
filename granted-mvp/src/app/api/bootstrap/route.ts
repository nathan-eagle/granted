import { NextResponse } from "next/server";
import { ensureSession, PROJECT_COOKIE, SESSION_COOKIE } from "@/lib/session-store";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server-auth";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const supabase = await createSupabaseRouteHandlerClient();
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  const projectId = url.searchParams.get("projectId");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const state = await ensureSession({
    sessionIdFromClient: sessionId,
    projectIdFromClient: projectId,
    authUserId: user?.id ?? null,
    authEmail: user?.email ?? null,
  });

  const response = NextResponse.json(state, {
    headers: {
      "Cache-Control": "no-store",
    },
  });

  response.cookies.set(SESSION_COOKIE, state.sessionId, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });

  response.cookies.set(PROJECT_COOKIE, state.projectId, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
