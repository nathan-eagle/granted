import { draftSection } from "@/server/tools/draftSection";
import { loadDraftMarkdown, upsertDraftMarkdown } from "@/lib/session-store";

export const runtime = "nodejs";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeString(value: string | null): string {
  return value?.trim() ?? "";
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const sessionId = normalizeString(url.searchParams.get("sessionId"));
  const sectionId = normalizeString(url.searchParams.get("sectionId"));

  if (!sessionId || !sectionId) {
    return jsonResponse({ error: "Missing sessionId or sectionId" }, 400);
  }

  try {
    const markdown = (await loadDraftMarkdown(sessionId, sectionId)) ?? "";
    return jsonResponse({ markdown });
  } catch (error) {
    console.error("Failed to load draft", error);
    return jsonResponse({ error: "Failed to load draft" }, 500);
  }
}

interface DraftPostBody {
  sessionId?: string;
  sectionId?: string;
  markdown?: string;
  mode?: "save" | "generate";
  prompt?: string;
  wordTarget?: number | null;
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as DraftPostBody;
  const sessionId = normalizeString(body.sessionId ?? null);
  const sectionId = normalizeString(body.sectionId ?? null);
  if (!sessionId || !sectionId) {
    return jsonResponse({ error: "Missing sessionId or sectionId" }, 400);
  }

  const mode = body.mode ?? "save";

  try {
    if (mode === "generate") {
      const prompt = normalizeString(body.prompt ?? null);
      if (!prompt) {
        return jsonResponse({ error: "Missing prompt for draft generation" }, 400);
      }
      const result = await draftSection({
        sectionId,
        prompt,
        wordTarget: body.wordTarget ?? null,
      });
      await upsertDraftMarkdown(sessionId, sectionId, result.markdown);
      return jsonResponse({ markdown: result.markdown });
    }

    const markdown = typeof body.markdown === "string" ? body.markdown : "";
    await upsertDraftMarkdown(sessionId, sectionId, markdown);
    return jsonResponse({ markdown });
  } catch (error) {
    console.error("Failed to persist draft", error);
    return jsonResponse({ error: "Failed to persist draft" }, 500);
  }
}
