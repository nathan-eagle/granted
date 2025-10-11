import { ingestFromUrls } from "@/server/tools/ingestFromUrls";

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
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Import failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
