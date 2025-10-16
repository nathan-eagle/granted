"use client";

import { useMemo } from "react";
import { CoverageSnapshot, SourceAttachment, CoverageSlotFact, DefinitionOfDoneStatus } from "@/lib/types";
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
  selectedId?: string | null;
  sources?: SourceAttachment[];
  onToggleNA?: (slotId: string, current: boolean, label: string, condition?: string | null) => void;
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

function shouldShowNaToggle(item: DefinitionOfDoneStatus): boolean {
  if (item.requiredness === "conditional") {
    return true;
  }
  const text = `${item.label} ${item.condition ?? ""}`.toLowerCase();
  return text.includes("if ") || text.includes(" only if") || text.includes("conditional");
}

export default function CoveragePanel({ coverage, onSelect, selectedId, sources = [], onToggleNA }: CoveragePanelProps) {
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
                className={`coverage-slot coverage-slot--${slot.status}${selectedId === slot.id ? " coverage-slot--selected" : ""}`}
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
                  {slot.items && slot.items.length > 0 ? (
                    <ul className="coverage-dod-list">
                      {slot.items.map((item) => {
                        const isNA = Boolean(item.notApplicable);
                        const showToggle = typeof onToggleNA === "function" && shouldShowNaToggle(item);
                        return (
                          <li
                            key={item.id}
                            className={`coverage-dod-item coverage-dod-item--${item.satisfied ? "done" : "open"}${isNA ? " coverage-dod-item--na" : ""}`}
                          >
                            <span className="coverage-dod-indicator" aria-hidden="true">
                              {item.satisfied ? "✓" : isNA ? "–" : "○"}
                            </span>
                            <span className="coverage-dod-label">
                              {item.label}
                              {item.condition ? (
                                <span className="coverage-dod-condition">{item.condition}</span>
                              ) : null}
                            </span>
                            {showToggle ? (
                              <button
                                type="button"
                                className={`coverage-na-toggle${isNA ? " coverage-na-toggle--active" : ""}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onToggleNA?.(item.id, isNA, item.label, item.condition ?? null);
                                }}
                              >
                                {isNA ? "Clear N/A" : "Mark N/A"}
                              </button>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  {slot.facts && slot.facts.length > 0 ? (
                    <ul className="coverage-fact-list">
                      {slot.facts.map((fact, index) => {
                        const label = FACT_LABELS.get(fact.slotId) ?? fact.slotId;
                        const tooltip = buildEvidenceTooltip(fact, sourceLabels);
                        return (
                          <li key={`${fact.slotId}-${index}`} className="coverage-fact" title={tooltip}>
                            <span className="coverage-fact__label">{label}</span>
                            <span className="coverage-fact__value">{fact.valueText}</span>
                            {typeof fact.verified === "boolean" ? (
                              <span
                                className={`coverage-fact__badge coverage-fact__badge--${fact.verified ? "verified" : "unverified"}`}
                              >
                                {fact.verified ? "Verified" : "Unverified"}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  {slot.questions && slot.questions.length > 0 ? (
                    <p className="coverage-slot__questions">{slot.questions.length} open question{slot.questions.length > 1 ? "s" : ""}</p>
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
