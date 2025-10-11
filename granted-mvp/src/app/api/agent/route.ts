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

    const sseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const textStream = stream.toTextStream();
          for await (const value of textStream as AsyncIterable<string>) {
            if (value) {
              controller.enqueue(
                encoder.encode(`event: token\ndata: ${value.replace(/\r\n/g, "\n")}\n\n`),
              );
            }
          }

          await stream.completed;
          const finalOutput = stream.finalOutput ?? "";

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

          const envelope: AgentRunEnvelope = {
            message: typeof finalOutput === "string" ? finalOutput : JSON.stringify(finalOutput),
            coverage: context.coverage ?? null,
            fixNext: context.fixNext ?? null,
            sources: context.sources,
            tighten: context.tighten ?? null,
            provenance: context.provenance ?? null,
          };
          controller.enqueue(encoder.encode(`event: envelope\ndata: ${JSON.stringify(envelope)}\n\n`));
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: (error as Error).message })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
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
