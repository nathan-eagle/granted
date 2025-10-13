import { NextResponse } from "next/server";
import { enqueueJob } from "@/lib/jobs";

export const runtime = "nodejs";

interface EnqueuePayload {
  sessionId?: string;
  kind?: string;
  payload?: Record<string, unknown>;
}

const ALLOWED_KINDS = new Set(["normalize", "autodraft", "tighten", "ingest_url", "ingest_file"]);

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as EnqueuePayload;
  if (!body.sessionId || !body.kind || !ALLOWED_KINDS.has(body.kind)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await enqueueJob(body.sessionId, body.kind as Parameters<typeof enqueueJob>[1], body.payload ?? {});
  return NextResponse.json({ ok: true });
}
