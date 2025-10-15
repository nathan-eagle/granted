"use client";

import { useMemo } from "react";
import { CoverageSnapshot, SourceAttachment, CoverageSlotFact } from "@/lib/types";
import { RFP_FACT_SLOTS } from "@/lib/rfp-fact-slots";

const EMPTY_COVERAGE: CoverageSnapshot = {
  score: 0,
  summary: "No sections mapped yet. Upload RFP materials or ask the assistant to summarize key requirements.",
  slots: [],
  updatedAt: Date.now(),
};

export interface CoveragePanelProps {
  coverage?: CoverageSnapshot | null;
  onSelect?: (slotId: string) => void;
  sources?: SourceAttachment[];
}

const STATUS_META = {
  complete: {
    icon: "●",
    label: "Complete",
    tooltip: "High-confidence facts detected (≥0.80).",
  },
  partial: {
    icon: "◑",
    label: "Partial",
    tooltip: "Some grounded facts captured; more detail needed (≥0.60).",
  },
  missing: {
    icon: "○",
    label: "Missing",
    tooltip: "No grounded facts found yet.",
  },
} as const satisfies Record<string, { icon: string; label: string; tooltip: string }>;

const FACT_LABELS = new Map(RFP_FACT_SLOTS.map((definition) => [definition.slotId, definition.summary]));

function truncateSnippet(snippet?: string | null): string | null {
  if (!snippet) return null;
  const normalized = snippet.trim().replace(/\s+/g, " ");
  if (normalized.length <= 180) {
    return normalized;
  }
  return `${normalized.slice(0, 177)}…`;
}

function buildEvidenceTooltip(
  fact: CoverageSlotFact,
  sourceLabels: Map<string, string>,
): string | undefined {
  const parts: string[] = [];
  parts.push(`Value: ${fact.valueText}`);
  if (typeof fact.confidence === "number") {
    parts.push(`Confidence: ${(fact.confidence * 100).toFixed(0)}%`);
  }
  const snippet = truncateSnippet(fact.evidence?.snippet);
  if (snippet) {
    parts.push(`Snippet: "${snippet}"`);
  }
  if (fact.evidence?.page !== undefined && fact.evidence?.page !== null) {
    parts.push(`Page: ${fact.evidence.page}`);
  }
  if (fact.evidence?.href) {
    parts.push(`Link: ${fact.evidence.href}`);
  }
  if (fact.evidence?.fileId) {
    const label = sourceLabels.get(fact.evidence.fileId) ?? "Uploaded source";
    parts.push(`Source: ${label}`);
  }
  return parts.length ? parts.join("\n") : undefined;
}

function formatMissingList(labels: string[]): string {
  if (labels.length === 1) {
    return labels[0];
  }
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

export default function CoveragePanel({ coverage, onSelect, sources = [] }: CoveragePanelProps) {
  const snapshot = useMemo(() => coverage ?? EMPTY_COVERAGE, [coverage]);
  const formattedScore = Math.round(snapshot.score * 100);
  const sourceLabels = useMemo(() => new Map(sources.map((source) => [source.id, source.label])), [sources]);

  return (
    <aside className="panel-surface coverage-panel">
      <header className="panel-header">
        <div>
          <h2 className="panel-title">Coverage</h2>
          <p className="panel-subtitle">
            {snapshot.slots.length ? "Track RFP requirements" : "Attach source material to begin"}
          </p>
        </div>
        <span className="coverage-score" aria-label={`Coverage score ${formattedScore}%`}>
          {formattedScore}%
        </span>
      </header>

      <section className="coverage-summary">
        <p>{snapshot.summary}</p>
      </section>

      <section className="coverage-slots scroll-area" aria-live="polite">
        {snapshot.slots.length === 0 ? (
          <p className="coverage-empty">No coverage slots yet.</p>
        ) : (
          <ul>
            {snapshot.slots.map((slot) => (
              <li
                key={slot.id}
                className={`coverage-slot coverage-slot--${slot.status}`}
                onClick={() => onSelect?.(slot.id)}
                role={onSelect ? "button" : undefined}
                tabIndex={onSelect ? 0 : undefined}
                onKeyDown={
                  onSelect
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelect(slot.id);
                        }
                      }
                    : undefined
                }
              >
                <div>
                  <p className="coverage-slot__label">{slot.label}</p>
                  {slot.notes ? <p className="coverage-slot__notes">{slot.notes}</p> : null}
                  {slot.facts && slot.facts.length > 0 ? (
                    <ul className="coverage-fact-list">
                      {slot.facts.map((fact, index) => {
                        const label = FACT_LABELS.get(fact.slotId) ?? fact.slotId;
                        const tooltip = buildEvidenceTooltip(fact, sourceLabels);
                        return (
                          <li key={`${fact.slotId}-${index}`} className="coverage-fact" title={tooltip}>
                            <span className="coverage-fact__label">{label}</span>
                            <span className="coverage-fact__value">{fact.valueText}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  {slot.missingFactSlotIds && slot.missingFactSlotIds.length > 0 ? (
                    <p className="coverage-slot__missing">
                      Need: {formatMissingList(slot.missingFactSlotIds.map((id) => FACT_LABELS.get(id) ?? id))}
                    </p>
                  ) : null}
                </div>
                {(() => {
                  const meta = STATUS_META[slot.status] ?? STATUS_META.missing;
                  return (
                    <span className="coverage-slot__status" title={meta.tooltip} aria-label={`${meta.label} status`}>
                      <span className="coverage-slot__status-icon" aria-hidden="true">
                        {meta.icon}
                      </span>
                      <span className="coverage-slot__status-text">{meta.label}</span>
                    </span>
                  );
                })()}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
