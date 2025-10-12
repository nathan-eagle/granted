import { streamAgentResponse } from "@/lib/agents";
import type { AgentRunEnvelope } from "@/lib/types";

export const runtime = "nodejs";

interface AgentRequestBody {
  sessionId: string;
  messages: { role: string; content: string }[];
  fixNextId?: string | null;
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as AgentRequestBody;
  if (!body.sessionId || !Array.isArray(body.messages)) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { stream, context } = await streamAgentResponse(body);
    const encoder = new TextEncoder();

    const ndjsonStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (payload: AgentRunEnvelope) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        try {
          const textStream = stream.toTextStream();
          for await (const value of textStream as AsyncIterable<string>) {
            if (value) {
              write({ type: "message", delta: value });
            }
          }

          await stream.completed;

          if (process.env.NODE_ENV !== "production") {
            const coverageScore = context.coverage?.score ?? 0;
            const tightenCompliance = context.tighten?.withinLimit;
            const provenance = context.provenance;
            const provenancePct = provenance && provenance.totalParagraphs > 0
              ? provenance.paragraphsWithProvenance / provenance.totalParagraphs
              : 0;
            console.info(
              "[grant-agent] session=%s coverageScore=%.2f tightenCompliance=%s provenance=%.0f%%",
              context.sessionId,
              coverageScore,
              tightenCompliance === undefined ? "n/a" : String(tightenCompliance),
              provenancePct * 100,
            );
          }

          write({ type: "message", delta: "", done: true });

          if (context.coverage) {
            write({ type: "coverage", coverage: context.coverage });
          }

          write({ type: "fixNext", fixNext: context.fixNext ?? null });

          if (context.sources && context.sources.length > 0) {
            write({ type: "sources", sources: context.sources });
          }

          write({ type: "tighten", tighten: context.tighten ?? null });
          write({ type: "provenance", provenance: context.provenance ?? null });

          controller.close();
        } catch (error) {
          console.error(error);
          write({ type: "message", delta: "", done: true });
          controller.close();
        }
      },
    });

    return new Response(ndjsonStream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to start agent" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
