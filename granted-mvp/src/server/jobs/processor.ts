import type { DbJobRow } from "@/lib/supabase";
import { enqueueJob, completeJob } from "@/lib/jobs";
import { ensureVectorStore } from "@/lib/vector-store";
import { persistAssistantTurn, upsertDraftMarkdown } from "@/lib/session-store";
import { normalizeRfp } from "@/server/tools/normalizeRfp";
import { coverageAndNext } from "@/server/tools/coverageAndNext";
import { draftSection } from "@/server/tools/draftSection";
import type { CoverageSlot, CoverageSnapshot, FixNextSuggestion } from "@/lib/types";
import type { GrantAgentContext } from "@/lib/agent-context";

function extractChecklist(notes?: string): string[] {
  if (!notes) return [];
  return notes
    .split(/[\n•]+/)
    .flatMap((segment) => segment.split(/[,;]+/))
    .map((item) => item.replace(/^[•\-\u2013\u2014]+\s*/, "").trim())
    .filter((item) => item.length > 0);
}

function formatFixNextMessage(coverage: CoverageSnapshot, next: FixNextSuggestion, slot: CoverageSlot): string {
  const percent = Math.round((coverage.score ?? 0) * 100);
const checklist = extractChecklist(slot.notes);
  if (checklist.length === 0) {
    return `Coverage ${percent}% → Next focus: ${slot.label}. Please provide the remaining detail so I can draft it.`;
  }
  const [first] = checklist;
  return `Coverage ${percent}% → Next focus: ${slot.label}. Please share ${first.toLowerCase()}.`;
}

async function runNormalize(sessionId: string): Promise<{ coverage: CoverageSnapshot; fixNext: FixNextSuggestion | null }> {
  const { vectorStoreId } = await ensureVectorStore(sessionId);
  const context: GrantAgentContext = {
    sessionId,
    vectorStoreId,
  };
  await normalizeRfp(context);
  const result = await coverageAndNext(context);
  return { coverage: result.coverage, fixNext: result.fixNext ?? null };
}

async function runAutodraft(sessionId: string): Promise<void> {
  const { vectorStoreId } = await ensureVectorStore(sessionId);
  const context: GrantAgentContext = {
    sessionId,
    vectorStoreId,
  };

  await normalizeRfp(context);
  const { coverage, fixNext } = await coverageAndNext(context);

  if (!coverage || coverage.slots.length === 0) {
    await persistAssistantTurn(sessionId, {
      content:
        "I finished normalizing the RFP, but no coverage slots were detected. Share a solicitation or project context so I can start drafting.",
      coverage,
      fixNext,
    });
    return;
  }

  if (!fixNext || fixNext.id === "export") {
    await persistAssistantTurn(sessionId, {
      content: `Coverage ${Math.round((coverage.score ?? 0) * 100)}% — Everything is mapped. Export when you’re ready or tighten specific sections.`,
      coverage,
      fixNext,
    });
    return;
  }

  const slot = coverage.slots.find((item) => item.id === fixNext.id);
  if (!slot) {
    return;
  }

  if (slot.status === "missing") {
    await persistAssistantTurn(sessionId, {
      content: formatFixNextMessage(coverage, fixNext, slot),
      coverage,
      fixNext,
    });
    return;
  }

  const prompt = [
    `Create a first-pass draft for "${slot.label}".`,
    slot.notes ? `Focus on: ${slot.notes}.` : null,
    "Write in markdown with clear headings and concise paragraphs. Cite sources inline like [RFP] or [ORG] when relevant.",
  ]
    .filter(Boolean)
    .join(" ");

  const result = await draftSection({
    sectionId: slot.id,
    prompt,
    wordTarget: 450,
  });

  await upsertDraftMarkdown(sessionId, slot.id, result.markdown, "complete");

  await normalizeRfp(context);
  const followUp = await coverageAndNext(context);

  await persistAssistantTurn(sessionId, {
    content: `Drafted **${slot.label}**. Open the section workspace to review and make edits.`,
    coverage: followUp.coverage,
    fixNext: followUp.fixNext,
  });

  if (followUp.fixNext && followUp.fixNext.id !== "export") {
    await enqueueJob(sessionId, "autodraft");
  }
}

export async function processJob(job: DbJobRow): Promise<void> {
  try {
    switch (job.kind) {
      case "normalize": {
        const { coverage, fixNext } = await runNormalize(job.session_id);
        await persistAssistantTurn(job.session_id, {
          content: `Coverage updated. ${Math.round((coverage.score ?? 0) * 100)}% of sections mapped.`,
          coverage,
          fixNext,
        });
        if (fixNext && fixNext.id !== "export") {
          await enqueueJob(job.session_id, "autodraft");
        }
        await completeJob(job.id, "done", { coverage });
        break;
      }
      case "autodraft": {
        await runAutodraft(job.session_id);
        await completeJob(job.id, "done");
        break;
      }
      default: {
        await completeJob(job.id, "canceled", null, `Unsupported job kind: ${job.kind}`);
      }
    }
  } catch (error) {
    console.error("Job processing failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    await completeJob(job.id, "error", null, message);
  }
}
