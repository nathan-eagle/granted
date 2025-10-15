import { NextRequest, NextResponse } from "next/server";
import { ensureVectorStore } from "@/lib/vector-store";
import type { GrantAgentContext } from "@/lib/agent-context";
import { normalizeRfp } from "@/server/tools/normalizeRfp";
import { coverageAndNext } from "@/server/tools/coverageAndNext";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId } = await params;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  try {
    const { vectorStoreId } = await ensureVectorStore(sessionId);
    const context: GrantAgentContext = {
      sessionId,
      vectorStoreId,
    };
    const normalizeResult = await normalizeRfp(context);
    const { coverage, fixNext } = await coverageAndNext(context);
    return NextResponse.json({ coverage, fixNext, promotions: normalizeResult.promotions });
  } catch (error) {
    if (error instanceof Error) {
      console.error("[api/coverage] failed", { message: error.message, stack: error.stack });
    } else {
      console.error("[api/coverage] failed", error);
    }
    return NextResponse.json({ error: "Failed to compute coverage" }, { status: 500 });
  }
}
