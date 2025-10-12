"use client";

import { useCallback, useState } from "react";
import Chat from "./Chat";
import CoveragePanel from "./CoveragePanel";
import SourceRail from "./SourceRail";
import type {
  AgentRunEnvelope,
  CoverageSnapshot,
  FixNextSuggestion,
  SourceAttachment,
  TightenSectionSnapshot,
  ProvenanceSnapshot,
} from "@/lib/types";
import type { SessionState } from "@/lib/session-store";

interface WorkspaceProps {
  initialState: SessionState;
}

export default function Workspace({ initialState }: WorkspaceProps) {
  const [coverage, setCoverage] = useState<CoverageSnapshot | null>(initialState.coverage);
  const [fixNext, setFixNext] = useState<FixNextSuggestion | null>(initialState.fixNext);
  const [sources, setSources] = useState<SourceAttachment[]>(initialState.sources);
  const [, setTighten] = useState<TightenSectionSnapshot | null>(initialState.tighten);
  const [, setProvenance] = useState<ProvenanceSnapshot | null>(initialState.provenance);
  const sessionId = initialState.sessionId;

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
            dedupe.set(source.id, source);
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
  }, []);

  const handleSourcesUpdate = useCallback((incoming: SourceAttachment[]) => {
    setSources((prev) => {
      const dedupe = new Map<string, SourceAttachment>();
      [...prev, ...incoming].forEach((source) => {
        dedupe.set(source.id, source);
      });
      return Array.from(dedupe.values());
    });
  }, []);

  return (
    <div className="workspace-grid">
      <SourceRail sources={sources} />
      <Chat
        initialMessages={initialState.messages}
        fixNext={fixNext}
        sessionId={sessionId}
        onEnvelope={handleEnvelope}
        onSourcesUpdate={handleSourcesUpdate}
      />
      <CoveragePanel coverage={coverage} />
    </div>
  );
}
