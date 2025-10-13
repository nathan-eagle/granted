import { NextResponse } from "next/server";
import {
  ensureAppUser,
  listProjectsForOwner,
  createSessionForProject,
  ensureSession,
  PROJECT_COOKIE,
  SESSION_COOKIE,
} from "@/lib/session-store";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server-auth";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export const runtime = "nodejs";

interface UseGrantBody {
  projectId?: string;
}

export async function POST(req: Request): Promise<Response> {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as UseGrantBody;
  const projectId = body.projectId?.trim();
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const appUser = await ensureAppUser(user.id, user.email ?? undefined);
  const grants = await listProjectsForOwner(appUser.id);
  const grant = grants.find((item) => item.id === projectId);
  if (!grant) {
    return NextResponse.json({ error: "Grant not found" }, { status: 404 });
  }

  const session = await createSessionForProject(grant.id);
  const state = await ensureSession({
    sessionIdFromClient: session.id,
    projectIdFromClient: grant.id,
    authUserId: user.id,
    authEmail: user.email ?? null,
  });

  const response = NextResponse.json({
    sessionId: state.sessionId,
    projectId: state.projectId,
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
