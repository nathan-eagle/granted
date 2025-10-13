import { NextResponse } from "next/server";
import type { Session } from "@supabase/supabase-js";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server-auth";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = requestUrl.searchParams.get("redirect") ?? "/";

  if (code) {
    const supabase = await createSupabaseRouteHandlerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Supabase exchange error", error);
    }
  }

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}

type AuthEventPayload = {
  event: string;
  session: Session | null;
};

export async function POST(req: Request): Promise<Response> {
  const supabase = await createSupabaseRouteHandlerClient();
  const { event, session } = (await req.json()) as AuthEventPayload;

  if (session && ["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "INITIAL_SESSION"].includes(event)) {
    const { error } = await supabase.auth.setSession(session);
    if (error) {
      console.error("Failed to persist Supabase session", error);
    }
  }

  if (event === "SIGNED_OUT") {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Failed to sign out Supabase session", error);
    }
  }

  return NextResponse.json({ status: "ok" });
}
