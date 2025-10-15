"use client";

import { useEffect, useMemo, useState } from "react";
import { diffLines } from "diff";
import type { CoverageSlot } from "@/lib/types";

export interface SectionEditorProps {
  sessionId: string;
  slot: CoverageSlot;
}

interface DraftResponseShape {
  markdown?: string;
  previousMarkdown?: string | null;
  updatedAt?: string | null;
}

export default function SectionEditor({ sessionId, slot }: SectionEditorProps) {
  const [markdown, setMarkdown] = useState("");
  const [previousMarkdown, setPreviousMarkdown] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remainingItems = useMemo(
    () => slot.items?.filter((item) => !item.satisfied) ?? [],
    [slot.items],
  );
  const diff = useMemo(() => {
    if (!previousMarkdown) return [];
    return diffLines(previousMarkdown, markdown);
  }, [previousMarkdown, markdown]);

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
        const json = (await res.json()) as DraftResponseShape;
        setMarkdown(json.markdown ?? "");
        setPreviousMarkdown(json.previousMarkdown ?? null);
        setUpdatedAt(json.updatedAt ?? null);
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
      const json = (await res.json()) as DraftResponseShape;
      setMarkdown(json.markdown ?? "");
      setPreviousMarkdown(json.previousMarkdown ?? null);
      setUpdatedAt(json.updatedAt ?? null);
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
        remainingItems.length
          ? `Fill in the remaining items: ${remainingItems.map((item) => item.label).join(", ")}.`
          : null,
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
      const json = (await res.json()) as DraftResponseShape;
      setMarkdown(json.markdown ?? "");
      setPreviousMarkdown(json.previousMarkdown ?? null);
      setUpdatedAt(json.updatedAt ?? null);
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
    <div className="section-editor" role="region" aria-labelledby="section-editor-heading">
      <header className="section-editor-header">
        <div>
          <h2 id="section-editor-heading">{slot.label}</h2>
          <p className="section-editor-subtitle">
            Status: <span className={`section-status section-status--${slot.status}`}>{slot.status}</span>
          </p>
          {updatedAt ? <p className="section-editor-timestamp">Last updated {new Date(updatedAt).toLocaleString()}</p> : null}
        </div>
      </header>

      <div className="section-editor-content">
        <section className="section-editor-checklist">
          <h3>Definition of Done</h3>
          {slot.items && slot.items.length > 0 ? (
            <ul>
              {slot.items.map((item) => (
                <li key={item.id} className={item.satisfied ? "dod-item dod-item--done" : "dod-item"}>
                  <span className="dod-indicator" aria-hidden="true">
                    {item.satisfied ? "✓" : "○"}
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          ) : (
            <p>No structured requirements configured for this section.</p>
          )}
        </section>

        {previousMarkdown ? (
          <section className="section-editor-diff">
            <h3>Changes since last version</h3>
            <pre>
              {diff.map((part, index) => (
                <span
                  key={`${part.added ? "added" : part.removed ? "removed" : "neutral"}-${index}`}
                  className={
                    part.added ? "diff-chunk diff-chunk--added" : part.removed ? "diff-chunk diff-chunk--removed" : "diff-chunk"
                  }
                >
                  {part.value}
                </span>
              ))}
            </pre>
          </section>
        ) : null}

        <section className="section-editor-draft">
          <label htmlFor="section-editor-textarea">Draft markdown</label>
          {loading ? (
            <p className="section-editor-loading">Loading draft…</p>
          ) : (
            <textarea
              id="section-editor-textarea"
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              rows={18}
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
    </div>
  );
}
