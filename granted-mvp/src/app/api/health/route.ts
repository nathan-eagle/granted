import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const checks: Record<string, { status: "ok" | "error"; message?: string }> = {};

  try {
    const supabase = await getSupabaseAdmin();
    await supabase.from("sessions").select("id").limit(1);
    checks.supabase = { status: "ok" };
  } catch (error) {
    const message = error instanceof Error ? `${error.message}` : "Unknown error";
    checks.supabase = { status: "error", message };
  }

  try {
    const client = getOpenAI();
    await client.models.list();
    checks.openai = { status: "ok" };
  } catch (error) {
    const message = error instanceof Error ? `${error.message}` : "Unknown error";
    checks.openai = { status: "error", message };
  }

  const status = Object.values(checks).every((check) => check.status === "ok") ? "ok" : "degraded";
  return NextResponse.json({ status, checks });
}
