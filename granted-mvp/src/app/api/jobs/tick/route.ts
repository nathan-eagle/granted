import { NextResponse } from "next/server";
import { claimNextJob } from "@/lib/jobs";
import { processJob } from "@/server/jobs/processor";

export const runtime = "nodejs";

interface TickPayload {
  sessionId?: string;
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as TickPayload;
  const job = await claimNextJob(body.sessionId ?? undefined);
  if (!job) {
    return NextResponse.json({ processed: false });
  }

  await processJob(job);
  return NextResponse.json({ processed: true, job: { id: job.id, kind: job.kind, sessionId: job.session_id } });
}
