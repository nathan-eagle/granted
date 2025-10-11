"use client";

import { useMemo } from "react";
import { CoverageSnapshot } from "@/lib/types";

const EMPTY_COVERAGE: CoverageSnapshot = {
  score: 0,
  summary: "No sections mapped yet. Upload RFP materials or ask the assistant to summarize key requirements.",
  slots: [],
  updatedAt: Date.now(),
};

export interface CoveragePanelProps {
  coverage?: CoverageSnapshot | null;
}

export default function CoveragePanel({ coverage }: CoveragePanelProps) {
  const snapshot = useMemo(() => coverage ?? EMPTY_COVERAGE, [coverage]);
  const formattedScore = Math.round(snapshot.score * 100);

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
              <li key={slot.id} className={`coverage-slot coverage-slot--${slot.status}`}>
                <div>
                  <p className="coverage-slot__label">{slot.label}</p>
                  {slot.notes ? <p className="coverage-slot__notes">{slot.notes}</p> : null}
                </div>
                <span className="coverage-slot__status">{slot.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
