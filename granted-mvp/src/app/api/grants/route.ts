import { NextResponse } from "next/server";
import {
  ensureAppUser,
  listProjectsForOwner,
  createProjectForOwner,
} from "@/lib/session-store";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server-auth";

export const runtime = "nodejs";

async function requireUser() {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!user) {
    return null;
  }
  return user;
}

export async function GET(): Promise<Response> {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ grants: [] }, { status: 200 });
  }

  const appUser = await ensureAppUser(user.id, user.email ?? undefined);
  const grants = await listProjectsForOwner(appUser.id);
  return NextResponse.json({
    grants: grants.map((grant) => ({
      id: grant.id,
      name: grant.title,
      updatedAt: grant.updated_at,
    })),
  });
}

interface CreateGrantBody {
  name?: string | null;
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as CreateGrantBody;
  const name = body.name?.trim();

  const appUser = await ensureAppUser(user.id, user.email ?? undefined);
  const project = await createProjectForOwner(appUser.id, name && name.length > 0 ? name : "Untitled grant");

  return NextResponse.json({
    grant: {
      id: project.id,
      name: project.title,
      updatedAt: project.updated_at,
    },
  });
}
