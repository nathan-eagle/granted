import { tool } from "@openai/agents";
import { z } from "zod";
import { COVERAGE_TEMPLATES, createCoverageSnapshot } from "@/lib/coverage";
import type { GrantAgentContext } from "@/lib/agent-context";
import type { CoverageSnapshot, FixNextSuggestion } from "@/lib/types";
import { saveCoverageSnapshot } from "@/lib/session-store";
import { RFP_FACT_SLOTS } from "@/lib/rfp-fact-slots";

export interface CoverageAndNextResult {
  coverage: CoverageSnapshot;
  fixNext: FixNextSuggestion;
}

const PRIORITY = new Map(COVERAGE_TEMPLATES.map((template) => [template.id, template.priority]));
const FACT_LABELS = new Map(RFP_FACT_SLOTS.map((definition) => [definition.slotId, definition.summary]));

const FIX_NEXT_CONFIG: Record<
  string,
  {
    missing: { label: string; description: string };
    partial?: { label: string; description: string };
  }
> = {
  "rfp-overview": {
    missing: {
      label: "Share the official RFP link or upload the solicitation PDF",
      description: "I need the solicitation details to map requirements and deadlines.",
    },
    partial: {
      label: "Clarify submission logistics",
      description: "Confirm deadline, submission portal, and any formatting rules.",
    },
  },
  eligibility: {
    missing: {
      label: "Confirm eligibility & registrations",
      description: "List applicant type, registrations (SAM, UEI), and compliance checkpoints.",
    },
    partial: {
      label: "Fill in remaining eligibility details",
      description: "Double-check registrations, partnering rules, and threshold criteria.",
    },
  },
  "project-narrative": {
    missing: {
      label: "Provide the project narrative or summary",
      description: "Outline the problem, beneficiaries, solution, and impact goals.",
    },
    partial: {
      label: "Fill gaps in the project narrative",
      description: "Add outcomes, differentiation, or evidence of need to strengthen the story.",
    },
  },
  "org-capacity": {
    missing: {
      label: "Summarize organizational capacity",
      description: "Share org history, mission alignment, and proof you can deliver.",
    },
    partial: {
      label: "Add capacity evidence",
      description: "Upload recent wins, partnerships, or infrastructure supporting success.",
    },
  },
  "key-personnel": {
    missing: {
      label: "Upload key personnel bios or resumes",
      description: "Attach short bios, resumes, or LinkedIn URLs for leads and contributors.",
    },
    partial: {
      label: "Complete personnel details",
      description: "Add remaining resumes or clarify roles and time commitments.",
    },
  },
  budget: {
    missing: {
      label: "Attach the draft budget or cost narrative",
      description: "Provide line items, indirect rates, and any match/cost share assumptions.",
    },
    partial: {
      label: "Finalize budget assumptions",
      description: "Clarify cost share, indirect rates, or outstanding line items.",
    },
  },
  timeline: {
    missing: {
      label: "Outline the project timeline",
      description: "Share milestones, start/end dates, and key activities per quarter.",
    },
    partial: {
      label: "Tighten the timeline",
      description: "Fill in missing milestones or dependencies so the schedule is clear.",
    },
  },
  evaluation: {
    missing: {
      label: "Describe the evaluation plan",
      description: "List metrics, data collection cadence, and who tracks outcomes.",
    },
    partial: {
      label: "Strengthen the evaluation plan",
      description: "Add success metrics, baselines, and continuous improvement tactics.",
    },
  },
  appendices: {
    missing: {
      label: "List required attachments and supporting docs",
      description: "Note support letters, forms, and certifications required for submission.",
    },
    partial: {
      label: "Gather remaining attachments",
      description: "Upload outstanding forms or letters so the packet is complete.",
    },
  },
};

function buildQuestion(slot: CoverageSnapshot["slots"][number]): FixNextSuggestion {
  const config = FIX_NEXT_CONFIG[slot.id];
  const missingFactLabels = (slot.missingFactSlotIds ?? [])
    .map((factId) => FACT_LABELS.get(factId) ?? factId)
    .filter(Boolean);

  if (!config) {
    return {
      id: slot.id,
      label: `Provide details for ${slot.label}`,
      description: buildDescription(slot.notes, missingFactLabels),
      kind: "question",
    };
  }

  const variant = slot.status === "partial" && config.partial ? config.partial : config.missing;
  const description = buildDescription(variant.description, missingFactLabels);
  return {
    id: slot.id,
    label: variant.label,
    description,
    kind: "question",
  };
}

function buildDescription(base: string | undefined, missingFactLabels: string[]): string | undefined {
  if (!missingFactLabels.length) {
    return base;
  }
  const list = missingFactLabels.length === 1
    ? missingFactLabels[0]
    : `${missingFactLabels.slice(0, -1).join(", ")} and ${missingFactLabels.at(-1)}`;
  if (!base) {
    return `Missing: ${list}.`;
  }
  return `${base} Missing: ${list}.`;
}

export function selectFixNext(coverage: CoverageSnapshot): FixNextSuggestion {
  const sorted = [...coverage.slots].sort((a, b) => {
    const aPriority = PRIORITY.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bPriority = PRIORITY.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.label.localeCompare(b.label);
  });

  const missing = sorted.find((slot) => slot.status === "missing");
  if (missing) {
    return buildQuestion(missing);
  }

  const partial = sorted.find((slot) => slot.status === "partial");
  if (partial) {
    return buildQuestion(partial);
  }

  return {
    id: "export",
    label: "Export a DOCX draft",
    kind: "export",
    description: "Everything is mapped. Generate a downloadable draft.",
  };
}

export async function coverageAndNext(context: GrantAgentContext): Promise<CoverageAndNextResult> {
  const creatingBaseline = !context.coverage;
  const coverage = context.coverage ??
    createCoverageSnapshot(
      COVERAGE_TEMPLATES.map((template, index) => ({
        id: template.id,
        label: template.label,
        status: index === 0 ? "partial" : "missing",
        notes: template.notes,
      })),
      "Baseline coverage initialized. Share the solicitation and project context to refine the map.",
    );

  const fixNext = selectFixNext(coverage);
  context.coverage = coverage;
  context.fixNext = fixNext;
  if (creatingBaseline || coverage) {
    await saveCoverageSnapshot(context.sessionId, coverage);
  }
  return { coverage, fixNext };
}

export const coverageAndNextTool = tool({
  name: "coverage_and_next",
  description: "Summarize coverage progress and emit the next best action.",
  parameters: z.object({ sessionId: z.string() }),
  strict: true,
  async execute(_input, runContext) {
    const context = runContext?.context as GrantAgentContext | undefined;
    if (!context) {
      throw new Error("Missing grant agent context");
    }
    const result = await coverageAndNext(context);
    return JSON.stringify(result);
  },
});
