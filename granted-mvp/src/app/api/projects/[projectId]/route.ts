import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server-auth";
import { ensureAppUser } from "@/lib/session-store";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, context: { params: Promise<{ projectId: string }> }): Promise<Response> {
  const { projectId } = await context.params;
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { name } = (await req.json()) as { name?: string };
  const trimmed = name?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const admin = await getSupabaseAdmin();
  const profile = await ensureAppUser(user.id, user.email ?? undefined);

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw projectError;
  }

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.owner_id && project.owner_id !== profile.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: updated, error: updateError } = await admin
    .from("projects")
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .select("id, name, updated_at")
    .single();

  if (updateError || !updated) {
    throw updateError ?? new Error("Failed to rename project");
  }

  return NextResponse.json({ project: updated });
}
