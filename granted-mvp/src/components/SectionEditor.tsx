"use client";

import { useEffect, useMemo, useState } from "react";
import type { CoverageSlot } from "@/lib/types";

export interface SectionEditorProps {
  sessionId: string;
  slot: CoverageSlot;
  onClose: () => void;
}

function extractChecklist(notes?: string): string[] {
  if (!notes) return [];
  return notes
    .split(/[\n•]+/)
    .flatMap((segment) => segment.split(/[,;]+/))
    .map((item) => item.replace(/^[•\-\u2013\u2014]+\s*/, "").trim())
    .filter((item) => item.length > 0);
}

export default function SectionEditor({ sessionId, slot, onClose }: SectionEditorProps) {
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checklist = useMemo(() => extractChecklist(slot.notes), [slot.notes]);

  useEffect(() => {
    setLoading(true);
    setStatusMessage(null);
    setError(null);
    const controller = new AbortController();
    const load = async () => {
      try {
        const params = new URLSearchParams({
          sessionId,
          sectionId: slot.id,
        });
        const res = await fetch(`/api/draft?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Failed to load draft (${res.status})`);
        }
        const json = (await res.json()) as { markdown?: string };
        setMarkdown(json.markdown ?? "");
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error(err);
          setError("Failed to load draft.");
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => {
      controller.abort();
    };
  }, [sessionId, slot.id]);

  useEffect(() => {
    if (!statusMessage) return;
    const timeoutId = window.setTimeout(() => setStatusMessage(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  const handleSave = async () => {
    if (loading || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sectionId: slot.id,
          markdown,
          mode: "save",
        }),
      });
      if (!res.ok) {
        throw new Error(`Failed to save draft (${res.status})`);
      }
      setStatusMessage("Draft saved.");
      void fetch("/api/jobs/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, kind: "autodraft" }),
      });
    } catch (err) {
      console.error(err);
      setError("Unable to save draft. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (loading || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const promptParts = [
        `Draft the "${slot.label}" section for our grant proposal.`,
        checklist.length ? `Focus on: ${checklist.join("; ")}.` : null,
        "Include persuasive but concise language in markdown format.",
        "Cite any provided sources in brackets like [RFP] when applicable.",
      ].filter(Boolean);
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sectionId: slot.id,
          mode: "generate",
          prompt: promptParts.join(" "),
          wordTarget: 400,
        }),
      });
      if (!res.ok) {
        throw new Error(`Draft generation failed (${res.status})`);
      }
      const json = (await res.json()) as { markdown?: string };
      setMarkdown(json.markdown ?? "");
      setStatusMessage("Generated a fresh draft.");
      void fetch("/api/jobs/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, kind: "autodraft" }),
      });
    } catch (err) {
      console.error(err);
      setError("Draft generation failed. Provide more context and try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <aside className="section-editor-overlay" role="dialog" aria-labelledby="section-editor-heading">
      <header className="section-editor-header">
        <div>
          <h2 id="section-editor-heading">{slot.label}</h2>
          <p className="section-editor-subtitle">
            Status: <span className={`section-status section-status--${slot.status}`}>{slot.status}</span>
          </p>
        </div>
        <button type="button" className="section-editor-close" onClick={onClose} aria-label="Close section editor">
          ✕
        </button>
      </header>

      <div className="section-editor-content">
        <section className="section-editor-checklist">
          <h3>Remaining items</h3>
          {checklist.length === 0 ? (
            <p>No specific checklist items for this section.</p>
          ) : (
            <ul>
              {checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="section-editor-draft">
          <label htmlFor="section-editor-textarea">Draft markdown</label>
          {loading ? (
            <p className="section-editor-loading">Loading draft…</p>
          ) : (
            <textarea
              id="section-editor-textarea"
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              rows={16}
              spellCheck={false}
              placeholder="Start drafting this section here."
            />
          )}
        </section>
      </div>

      <footer className="section-editor-footer">
        {error ? <p className="section-editor-error">{error}</p> : null}
        {statusMessage ? <p className="section-editor-status">{statusMessage}</p> : null}
        <div className="section-editor-actions">
          <button type="button" onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button type="button" onClick={handleGenerate} disabled={generating || loading}>
            {generating ? "Drafting…" : "Draft this section"}
          </button>
        </div>
      </footer>
    </aside>
  );
}
