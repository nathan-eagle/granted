import type { DbJobRow } from "@/lib/supabase";
import { enqueueJob, completeJob } from "@/lib/jobs";
import { ensureVectorStore } from "@/lib/vector-store";
import { persistAssistantTurn, upsertDraftMarkdown } from "@/lib/session-store";
import { normalizeRfp } from "@/server/tools/normalizeRfp";
import { coverageAndNext } from "@/server/tools/coverageAndNext";
import { draftSection } from "@/server/tools/draftSection";
import type { CoverageSlot, CoverageSnapshot, FixNextSuggestion } from "@/lib/types";
import type { GrantAgentContext } from "@/lib/agent-context";

function formatFixNextMessage(coverage: CoverageSnapshot, next: FixNextSuggestion, slot: CoverageSlot): string {
  const percent = Math.round((coverage.score ?? 0) * 100);
  const question = selectSpecificQuestion(slot);
  return `Coverage ${percent}% → Next focus: ${slot.label}. ${question}`;
}

const SLOT_QUESTIONS: Record<string, { missing: string; partial?: string; fallback?: string }> = {
  "rfp-overview": {
    missing: "What is the official solicitation title?",
    partial: "What is the full proposal deadline and submission portal?",
    fallback: "Share any remaining submission logistics so I can lock this in.",
  },
  eligibility: {
    missing: "Confirm the applicant is a U.S.-owned small business (≤500 employees) with a U.S. citizen or permanent resident PI employed ≥51% at the company.",
    partial:
      "Provide SAM registration status, UEI, and any required certifications or compliance checkpoints (e.g., human subjects, export).",
    fallback: "Share any remaining compliance details (registrations or certifications).",
  },
  "project-narrative": {
    missing: "Summarize the problem, beneficiaries, and solution in 3-4 sentences.",
    partial: "Add evidence of impact or differentiation that strengthens the story.",
  },
  "org-capacity": {
    missing: "Describe your organization's track record delivering similar work and key infrastructure.",
    partial: "Add a recent win or partnership that proves capacity.",
  },
  "key-personnel": {
    missing: "Provide bios or resumes for key personnel (names, roles, relevant experience).",
    partial: "Clarify time commitment and responsibilities for each key person.",
  },
  budget: {
    missing: "Share high-level budget line items and any required cost share or indirect rates.",
    partial: "Clarify assumptions for major line items or cost share commitments.",
  },
  timeline: {
    missing: "Outline major milestones with target dates for the project.",
    partial: "Add dependencies or deliverables for the remaining milestones.",
  },
  evaluation: {
    missing: "List the success metrics and how/when you'll collect the data.",
    partial: "Provide baselines or targets for those metrics.",
  },
  appendices: {
    missing: "List required attachments (letters, forms, certifications) and which ones you already have.",
    partial: "Upload or describe any outstanding attachments that are still missing.",
  },
};

function selectSpecificQuestion(slot: CoverageSlot): string {
  const entry = SLOT_QUESTIONS[slot.id];
  if (!entry) {
    return "Please share the remaining detail so I can finish this section.";
  }
  if (slot.status === "missing") {
    return entry.missing;
  }
  if (slot.status === "partial" && entry.partial) {
    return entry.partial;
  }
  return entry.fallback ?? "Share any remaining detail for this section.";
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
    vectorStoreId: context.vectorStoreId,
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
    console.info("[jobs] processing", { id: job.id, kind: job.kind, sessionId: job.session_id });
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
    console.error("[jobs] failed", { jobId: job.id, sessionId: job.session_id, error });
    const message = error instanceof Error ? error.message : "Unknown error";
    await completeJob(job.id, "error", null, message);
  }
}
