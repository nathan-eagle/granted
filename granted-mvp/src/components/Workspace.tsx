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

export default function Workspace({ initialState }: WorkspaceProps) {
  const [coverage, setCoverage] = useState<CoverageSnapshot | null>(initialState.coverage);
  const [fixNext, setFixNext] = useState<FixNextSuggestion | null>(initialState.fixNext);
  const [sources, setSources] = useState<SourceAttachment[]>(initialState.sources);
  const [, setTighten] = useState<TightenSectionSnapshot | null>(initialState.tighten);
  const [, setProvenance] = useState<ProvenanceSnapshot | null>(initialState.provenance);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>(initialState.messages);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const sessionId = useMemo(() => initialState.sessionId, [initialState.sessionId]);

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
  }, [sessionId]);

  useEffect(() => {
    if (!activeSlotId) return;
    const slotExists = coverage?.slots?.some((slot) => slot.id === activeSlotId);
    if (!slotExists) {
      setActiveSlotId(null);
    }
  }, [activeSlotId, coverage]);

  const activeSlot = useMemo(
    () => (activeSlotId ? coverage?.slots.find((slot) => slot.id === activeSlotId) ?? null : null),
    [activeSlotId, coverage],
  );

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
    setActiveSlotId((prev) => (prev === slotId ? null : slotId));
  }, []);

  return (
    <>
      <div className="workspace-grid">
        <SourceRail sources={sources} />
        <Chat
          initialMessages={initialMessages}
          fixNext={fixNext}
          sessionId={sessionId}
          onEnvelope={handleEnvelope}
          onSourcesUpdate={handleSourcesUpdate}
          canExport={canExport}
        />
        <CoveragePanel coverage={coverage} onSelect={handleSlotSelect} />
      </div>
      {activeSlot ? (
        <SectionEditor sessionId={sessionId} slot={activeSlot} onClose={() => setActiveSlotId(null)} />
      ) : null}
    </>
  );
}
