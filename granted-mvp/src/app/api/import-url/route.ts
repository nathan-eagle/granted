import { ingestFromUrls } from "@/server/tools/ingestFromUrls";
import { persistSources } from "@/lib/session-store";
import { enqueueJob } from "@/lib/jobs";

export const runtime = "nodejs";

interface ImportUrlBody {
  sessionId: string;
  urls: string[];
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as ImportUrlBody;
  if (!body.sessionId || !Array.isArray(body.urls) || body.urls.length === 0) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const result = await ingestFromUrls(body.sessionId, body.urls);
    await persistSources(body.sessionId, result.sources);
    await enqueueJob(body.sessionId, "normalize");
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("import-url failed", { message: error.message, stack: error.stack });
    } else {
      console.error("import-url failed", error);
    }
    return new Response(
      JSON.stringify({
        error: "Import failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
