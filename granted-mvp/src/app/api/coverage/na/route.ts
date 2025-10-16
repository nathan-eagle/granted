import { NextResponse } from "next/server";
import { ensureVectorStore } from "@/lib/vector-store";
import type { GrantAgentContext } from "@/lib/agent-context";
import { normalizeRfp } from "@/server/tools/normalizeRfp";
import { coverageAndNext } from "@/server/tools/coverageAndNext";
import { persistUserFact, clearNotApplicableFact } from "@/server/facts/persistUserFact";

export const runtime = "nodejs";

interface MarkNaBody {
  sessionId?: string;
  slotId?: string;
  na?: boolean;
  reason?: string | null;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as MarkNaBody;
    if (!body.sessionId || !body.slotId || typeof body.na !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (body.na) {
      await persistUserFact({
        sessionId: body.sessionId,
        slotId: body.slotId,
        valueText: "N/A",
        answerKind: "text",
        annotations: { na: true, reason: body.reason ?? null },
      });
    } else {
      await clearNotApplicableFact({ sessionId: body.sessionId, slotId: body.slotId });
    }

    const { vectorStoreId } = await ensureVectorStore(body.sessionId);
    const context: GrantAgentContext = {
      sessionId: body.sessionId,
      vectorStoreId,
    };
    await normalizeRfp(context);
    const { coverage, fixNext } = await coverageAndNext(context);
    return NextResponse.json({ coverage, fixNext });
  } catch (error) {
    if (error instanceof Error) {
      console.error("[api/coverage/na] failed", { message: error.message, stack: error.stack });
    } else {
      console.error("[api/coverage/na] failed", error);
    }
    return NextResponse.json({ error: "Failed to update coverage" }, { status: 500 });
  }
}
