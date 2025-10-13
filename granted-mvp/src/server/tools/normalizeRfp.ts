import { tool } from "@openai/agents";
import { z } from "zod";
import { createCoverageSnapshot, COVERAGE_TEMPLATES, promoteStatus } from "@/lib/coverage";
import type { GrantAgentContext } from "@/lib/agent-context";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { CoverageSnapshot, CoverageSlot, SourceAttachment } from "@/lib/types";
import { saveCoverageSnapshot } from "@/lib/session-store";

function toSourceAttachment(row: {
  openai_file_id: string;
  label: string;
  kind: string;
  href: string | null;
}): SourceAttachment {
  return {
    id: row.openai_file_id,
    label: row.label,
    kind: row.kind === "url" ? "url" : "file",
    href: row.href ?? undefined,
  };
}

function textMatches(text: string | null | undefined, keywords: string[]): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}


async function fetchSessionContext(sessionId: string): Promise<{
  sources: SourceAttachment[];
  userMessages: string[];
  assistantMessages: string[];
}> {
  const supabase = await getSupabaseAdmin();
  const [sourcesResult, messagesResult] = await Promise.all([
    supabase
      .from("sources")
      .select("openai_file_id, label, kind, href")
      .eq("session_id", sessionId),
    supabase
      .from("messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(200),
  ]);

  if (sourcesResult.error) {
    console.warn("normalizeRfp: failed to load sources", sourcesResult.error);
  }
  if (messagesResult.error) {
    console.warn("normalizeRfp: failed to load messages", messagesResult.error);
  }

  const sources = (sourcesResult.data ?? []).map(toSourceAttachment);
  const userMessages = (messagesResult.data ?? [])
    .filter((row) => row.role === "user" && typeof row.content === "string")
    .map((row) => row.content as string);
  const assistantMessages = (messagesResult.data ?? [])
    .filter((row) => row.role === "assistant" && typeof row.content === "string")
    .map((row) => row.content as string);

  return { sources, userMessages, assistantMessages };
}

function inferSlotStatus(
  templateId: string,
  defaultStatus: CoverageSlot["status"],
  previous: Map<string, CoverageSlot>,
  sourceMatches: boolean,
  userMatches: boolean,
  assistantMatches: boolean,
): CoverageSlot["status"] {
  const baseline: CoverageSlot["status"] = sourceMatches && assistantMatches
    ? "complete"
    : sourceMatches || userMatches
      ? "partial"
      : defaultStatus;

  const previousSlot = previous.get(templateId);
  if (!previousSlot) {
    return baseline;
  }

  return promoteStatus(previousSlot.status, baseline);
}

function summarizeCoverage(slots: CoverageSlot[]): string {
  const total = slots.length;
  const complete = slots.filter((slot) => slot.status === "complete").length;
  const partial = slots.filter((slot) => slot.status === "partial").length;
  const missing = total - complete - partial;
  const nextTarget = slots.find((slot) => slot.status === "missing") ?? slots.find((slot) => slot.status === "partial");
  const scorePercent = Math.round((complete + partial * 0.5) / total * 100);
  const segments = [
    `Coverage ${scorePercent}% (${complete}/${total} complete, ${partial} partial, ${missing} missing).`,
    nextTarget ? `Next focus: ${nextTarget.label}.` : "All sections mapped. Ready to export.",
  ];
  return segments.join(" ");
}

export interface NormalizeRfpResult {
  coverage: CoverageSnapshot;
}

export async function normalizeRfp(context: GrantAgentContext): Promise<NormalizeRfpResult> {
  const { sources, userMessages, assistantMessages } = await fetchSessionContext(context.sessionId);
  const previousSlots = new Map(context.coverage?.slots?.map((slot) => [slot.id, slot]) ?? []);
  context.sources = sources;

  const slots: CoverageSlot[] = COVERAGE_TEMPLATES.map((template) => {
    const sourceMatches = sources.some(
      (source) =>
        textMatches(source.label, template.sourceHints) || textMatches(source.href, template.sourceHints),
    );
    const userMatches = userMessages.some((message) => textMatches(message, template.messageHints));
    const assistantMatches = assistantMessages.some((message) =>
      textMatches(message, [...template.messageHints, template.label.toLowerCase()]),
    );
    const status = inferSlotStatus(
      template.id,
      "missing",
      previousSlots,
      sourceMatches,
      userMatches,
      assistantMatches,
    );

    return {
      id: template.id,
      label: template.label,
      status,
      notes: template.notes,
    };
  }).sort((a, b) => {
    const priority = new Map(COVERAGE_TEMPLATES.map((item, index) => [item.id, item.priority ?? index]));
    return (priority.get(a.id) ?? 99) - (priority.get(b.id) ?? 99);
  });

  const coverage = createCoverageSnapshot(slots, summarizeCoverage(slots));

  context.coverage = coverage;
  await saveCoverageSnapshot(context.sessionId, coverage);

  return { coverage };
}

export const normalizeRfpTool = tool({
  name: "normalize_rfp",
  description: "Create or update the normalized RFP structure for this session.",
  parameters: z.object({ sessionId: z.string() }),
  strict: true,
  async execute(_input, runContext) {
    const context = runContext?.context as GrantAgentContext | undefined;
    if (!context) {
      throw new Error("Missing grant agent context");
    }
    const result = await normalizeRfp(context);
    return JSON.stringify(result);
  },
});
