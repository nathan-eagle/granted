import { NextResponse } from "next/server";
import { persistUserFact } from "@/server/facts/persistUserFact";
import { ensureVectorStore } from "@/lib/vector-store";
import { normalizeRfp } from "@/server/tools/normalizeRfp";
import { coverageAndNext } from "@/server/tools/coverageAndNext";
import type { AnswerKind } from "@/lib/dod";
import type { GrantAgentContext } from "@/lib/agent-context";

interface AnswerPayload {
  sessionId: string;
  factIds: string[];
  valueText: string;
  answerKind: AnswerKind;
  annotations?: Record<string, unknown> | null;
}

function isAnswerPayload(body: unknown): body is AnswerPayload {
  if (typeof body !== "object" || body === null) return false;
  const payload = body as Record<string, unknown>;
  if (typeof payload.sessionId !== "string") return false;
  if (!Array.isArray(payload.factIds) || payload.factIds.some((id) => typeof id !== "string")) return false;
  if (typeof payload.valueText !== "string") return false;
  if (payload.answerKind !== "text" && payload.answerKind !== "date" && payload.answerKind !== "url") return false;
  return true;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    if (!isAnswerPayload(body)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { sessionId, factIds, valueText, answerKind, annotations } = body;
    if (factIds.length === 0) {
      return NextResponse.json({ error: "factIds must contain at least one id" }, { status: 400 });
    }

    for (const factId of factIds) {
      await persistUserFact({
        sessionId,
        slotId: factId,
        valueText,
        answerKind,
        annotations: annotations ?? null,
      });
    }

    const { vectorStoreId } = await ensureVectorStore(sessionId);
    const context: GrantAgentContext = {
      sessionId,
      vectorStoreId,
    };

    await normalizeRfp(context);
    const { coverage, fixNext } = await coverageAndNext(context);

    return NextResponse.json({ coverage, fixNext });
  } catch (error) {
    if (error instanceof Error) {
      console.error("[api/coach/answer] failed", { message: error.message, stack: error.stack });
    } else {
      console.error("[api/coach/answer] failed", error);
    }
    return NextResponse.json({ error: "Failed to record answer" }, { status: 500 });
  }
}
