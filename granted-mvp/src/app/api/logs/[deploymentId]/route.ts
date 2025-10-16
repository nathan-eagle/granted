import { NextResponse } from "next/server";

import { fetchDeploymentLogs } from "@/lib/vercel-logs";
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

  return user;
}

export async function GET(
  _req: Request,
  context: { params: { deploymentId: string } | Promise<{ deploymentId: string }> },
): Promise<Response> {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const params = await context.params;
  const deploymentId = params?.deploymentId?.trim();
  if (!deploymentId) {
    return NextResponse.json({ error: "Missing deploymentId" }, { status: 400 });
  }

  try {
    const logs = await fetchDeploymentLogs(deploymentId);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[api/logs] failed to fetch logs", { deploymentId, error });
    return NextResponse.json({ error: "Failed to fetch deployment logs" }, { status: 500 });
  }
}
