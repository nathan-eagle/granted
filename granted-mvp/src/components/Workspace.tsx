"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Chat from "./Chat";
import CoveragePanel from "./CoveragePanel";
import SectionEditor from "./SectionEditor";
import SourceRail from "./SourceRail";
import type {
  AgentRunEnvelope,
  ChatMessage,
  CoverageSnapshot,
  CoverageQuestion,
  FixNextSuggestion,
  SourceAttachment,
  TightenSectionSnapshot,
  ProvenanceSnapshot,
} from "@/lib/types";
import type { SessionState } from "@/lib/session-store";
import { getOrCreateSessionId } from "@/lib/session";

interface WorkspaceProps {
  initialState: SessionState;
}

type AutoState = "idle" | "queued" | "running";

export default function Workspace({ initialState }: WorkspaceProps) {
  const [coverage, setCoverage] = useState<CoverageSnapshot | null>(initialState.coverage);
  const [fixNext, setFixNext] = useState<FixNextSuggestion | null>(initialState.fixNext);
  const [sources, setSources] = useState<SourceAttachment[]>(initialState.sources);
  const [, setTighten] = useState<TightenSectionSnapshot | null>(initialState.tighten);
  const [, setProvenance] = useState<ProvenanceSnapshot | null>(initialState.provenance);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>(initialState.messages);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(
    initialState.coverage?.slots?.[0]?.id ?? null,
  );
  const [autoState, setAutoState] = useState<AutoState>("idle");
  const sessionId = useMemo(() => initialState.sessionId, [initialState.sessionId]);

  const enqueueJob = useCallback(
    async (kind: "normalize" | "autodraft" | "tighten" | "ingest_url" | "ingest_file") => {
      try {
        setAutoState((prev) => (prev === "running" ? prev : "queued"));
        await fetch("/api/jobs/enqueue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, kind }),
        });
      } catch (error) {
        console.error("Failed to enqueue job", error);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    getOrCreateSessionId(sessionId);
  }, [sessionId]);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        const res = await fetch("/api/bootstrap", { headers: { "Cache-Control": "no-store" } });
        if (!res.ok) {
          return;
        }
        const json = (await res.json()) as SessionState;
        if (!active) return;
        setCoverage(json.coverage);
        setFixNext(json.fixNext);
        setSources(json.sources);
        setTighten(json.tighten ?? null);
        setProvenance(json.provenance ?? null);
        setInitialMessages(json.messages);
        if (json.coverage?.slots?.some((slot) => slot.status !== "complete")) {
          void enqueueJob("autodraft");
        }
      } catch (error) {
        console.error("Failed to bootstrap session", error);
      }
    };

    if (typeof window !== "undefined") {
      void hydrate();
    }

    return () => {
      active = false;
    };
  }, [enqueueJob, sessionId]);

  useEffect(() => {
    if (!activeSlotId) return;
    const slotExists = coverage?.slots?.some((slot) => slot.id === activeSlotId);
    if (!slotExists) {
      setActiveSlotId(coverage?.slots?.[0]?.id ?? null);
    }
  }, [activeSlotId, coverage]);

  const activeSlot = useMemo(
    () => (activeSlotId ? coverage?.slots.find((slot) => slot.id === activeSlotId) ?? null : null),
    [activeSlotId, coverage],
  );

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch("/api/jobs/tick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { processed: boolean };
        if (json.processed) {
          setAutoState("running");
          setTimeout(() => {
            if (!cancelled) {
              setAutoState("idle");
            }
          }, 2000);
        } else {
          setAutoState("idle");
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Job tick failed", error);
        }
      }
    };

    void tick();
    const id = setInterval(tick, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionId]);

  const sourceKey = useCallback((source: SourceAttachment) => {
    const href = source.href?.toLowerCase();
    if (href && href.length > 0) {
      return href;
    }
    return source.label.toLowerCase();
  }, []);

  const canExport = useMemo(() => {
    if (!coverage || !coverage.slots.length) {
      return false;
    }
    return coverage.slots.every((slot) => slot.status === "complete");
  }, [coverage]);

  const handleEnvelope = useCallback((envelope: AgentRunEnvelope) => {
    switch (envelope.type) {
      case "coverage":
        setCoverage(envelope.coverage);
        break;
      case "fixNext":
        setFixNext(envelope.fixNext ?? null);
        break;
      case "sources":
        setSources((prev) => {
          const dedupe = new Map<string, SourceAttachment>();
          [...prev, ...envelope.sources].forEach((source) => {
            dedupe.set(sourceKey(source), source);
          });
          return Array.from(dedupe.values());
        });
        break;
      case "tighten":
        setTighten(envelope.tighten ?? null);
        break;
      case "provenance":
        setProvenance(envelope.provenance ?? null);
        break;
      case "message":
        // message envelopes are consumed within Chat
        break;
    }
  }, [sourceKey]);

  const handleSourcesUpdate = useCallback((incoming: SourceAttachment[]) => {
    setSources((prev) => {
      const dedupe = new Map<string, SourceAttachment>();
      [...prev, ...incoming].forEach((source) => {
        dedupe.set(sourceKey(source), source);
      });
      return Array.from(dedupe.values());
    });
  }, [sourceKey]);

  const handleSlotSelect = useCallback((slotId: string) => {
    setActiveSlotId(slotId);
  }, []);

  const handleToggleNA = useCallback(
    async (slotId: string, current: boolean, label: string, condition?: string | null) => {
      try {
        let reason: string | null = null;
        if (!current) {
          reason = window.prompt(
            `Mark "${label}" as Not Applicable. Add a short note (optional).`,
            condition ?? "",
          );
        }
        const res = await fetch("/api/coverage/na", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, slotId, na: !current, reason }),
        });
        if (!res.ok) {
          throw new Error(`Failed to toggle N/A (${res.status})`);
        }
        const json = (await res.json()) as { coverage: CoverageSnapshot; fixNext: FixNextSuggestion };
        setCoverage(json.coverage);
        setFixNext(json.fixNext ?? null);
      } catch (error) {
        console.error("Failed to toggle N/A", error);
      }
    },
    [sessionId],
  );

  const handleStartNewGrant = useCallback(async () => {
    try {
      const res = await fetch("/api/session/new", { method: "POST" });
      if (res.ok) {
        window.location.href = "/";
      } else {
        console.error("Failed to start new grant", await res.text());
      }
    } catch (error) {
      console.error("Failed to start new grant", error);
    }
  }, []);

  const handleAnswerQuestion = useCallback(
    async (question: CoverageQuestion, valueText: string) => {
      if (!valueText.trim()) {
        return;
      }
      try {
        const res = await fetch("/api/coach/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            factIds: question.factIds,
            valueText,
            answerKind: question.answerKind,
          }),
        });
        if (!res.ok) {
          throw new Error(`Failed to record answer (${res.status})`);
        }
        const json = (await res.json()) as { coverage: CoverageSnapshot; fixNext: FixNextSuggestion };
        setCoverage(json.coverage);
        setFixNext(json.fixNext ?? null);
      } catch (error) {
        console.error("Failed to record answer", error);
        throw error;
      }
    },
    [sessionId],
  );

  return (
    <div className="workspace-grid">
      <div className="workspace-left">
        <SourceRail sources={sources} onStartNewGrant={handleStartNewGrant} />
        <CoveragePanel
          coverage={coverage}
          onSelect={handleSlotSelect}
          selectedId={activeSlotId}
          sources={sources}
          onToggleNA={handleToggleNA}
        />
      </div>
      <main className="panel-surface workspace-center">
        {activeSlot ? (
          <SectionEditor sessionId={sessionId} slot={activeSlot} />
        ) : (
          <div className="editor-placeholder">
            <h2>Select a section to begin drafting</h2>
            <p>Choose a section on the left to view its requirements and start writing.</p>
          </div>
        )}
      </main>
      <section className="panel-surface workspace-right">
        <Chat
          initialMessages={initialMessages}
          fixNext={fixNext}
          sessionId={sessionId}
          onEnvelope={handleEnvelope}
          onSourcesUpdate={handleSourcesUpdate}
          canExport={canExport}
          autoState={autoState}
          onRequestJob={enqueueJob}
          activeQuestions={activeSlot?.questions ?? []}
          onAnswerQuestion={handleAnswerQuestion}
          activeSectionLabel={activeSlot?.label}
        />
      </section>
    </div>
  );
}
