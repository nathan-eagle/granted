import { streamAgentResponse } from "@/lib/agents";
import type { AgentRunEnvelope } from "@/lib/types";
import { persistAssistantTurn, persistUserMessage } from "@/lib/session-store";

export const runtime = "nodejs";

interface AgentRequestBody {
  sessionId: string;
  messages?: { role: string; content: string }[];
  fixNextId?: string | null;
  command?: string | null;
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as AgentRequestBody;
  if (!body.sessionId) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const history = Array.isArray(body.messages) ? body.messages : [];
    const hasCommand = typeof body.command === "string" && body.command.length > 0;
    const commandMessage =
      body.command === "normalize_rfp"
        ? {
            role: "user",
            content:
              "Call the normalize_rfp tool now and summarize the refreshed coverage map. Keep the reply concise and end with the next concrete ask.",
          }
        : null;

    const runMessages = commandMessage ? [...history, commandMessage] : history;

    const lastMessage = history.at(-1);
    if (!hasCommand && lastMessage && lastMessage.role === "user") {
      await persistUserMessage(body.sessionId, lastMessage.content);
    }

    if (hasCommand && !commandMessage) {
      return new Response(JSON.stringify({ error: `Unsupported command: ${body.command}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { stream, context } = await streamAgentResponse({
      sessionId: body.sessionId,
      messages: runMessages,
    });
    const encoder = new TextEncoder();
    let assistantContent = "";
    let latestCoverage = context.coverage ?? null;
    let latestFixNext = context.fixNext ?? null;
    let latestSources = context.sources ?? null;
    let latestTighten = context.tighten ?? null;
    let latestProvenance = context.provenance ?? null;

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
              assistantContent += value;
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
            latestCoverage = context.coverage;
          }

          const fixNextEnvelope = context.fixNext ?? null;
          write({ type: "fixNext", fixNext: fixNextEnvelope });
          latestFixNext = fixNextEnvelope;

          if (context.sources && context.sources.length > 0) {
            write({ type: "sources", sources: context.sources });
            latestSources = context.sources;
          }

          write({ type: "tighten", tighten: context.tighten ?? null });
          latestTighten = context.tighten ?? null;
          write({ type: "provenance", provenance: context.provenance ?? null });
          latestProvenance = context.provenance ?? null;

          controller.close();
        } catch (error) {
          console.error(error);
          write({ type: "message", delta: "", done: true });
          controller.close();
        }
      },
    });

    const response = new Response(ndjsonStream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    response.headers.append("X-Session-Id", body.sessionId);

    queueMicrotask(() => {
      const shouldPersist =
        assistantContent.trim().length > 0 ||
        latestCoverage !== null ||
        latestFixNext !== null ||
        (Array.isArray(latestSources) && latestSources.length > 0) ||
        latestTighten !== null ||
        latestProvenance !== null;

      if (!shouldPersist) {
        return;
      }

      void persistAssistantTurn(body.sessionId, {
        content: assistantContent,
        coverage: latestCoverage ?? null,
        fixNext: latestFixNext ?? null,
        sources: latestSources ?? undefined,
        tighten: latestTighten ?? null,
        provenance: latestProvenance ?? null,
      }).catch((error) => {
        console.error("Failed to persist assistant turn", error);
      });
    });

    return response;
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to start agent" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
