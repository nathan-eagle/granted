"use client";

import { useCallback, useMemo, useState } from "react";
import Chat from "./Chat";
import CoveragePanel from "./CoveragePanel";
import SourceRail from "./SourceRail";
import {
  AgentRunEnvelope,
  CoverageSnapshot,
  FixNextSuggestion,
  SourceAttachment,
  TightenSectionSnapshot,
  ProvenanceSnapshot,
} from "@/lib/types";

export default function Workspace() {
  const [coverage, setCoverage] = useState<CoverageSnapshot | null>(null);
  const [fixNext, setFixNext] = useState<FixNextSuggestion | null>(null);
  const [sources, setSources] = useState<SourceAttachment[]>([]);
  const [tighten, setTighten] = useState<TightenSectionSnapshot | null>(null);
  const [provenance, setProvenance] = useState<ProvenanceSnapshot | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());

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

  const workspaceProps = useMemo(
    () => ({
      coverage,
      fixNext,
      sources,
      tighten,
      provenance,
      sessionId,
      onEnvelope: handleEnvelope,
      onSourcesUpdate: setSources,
    }),
    [coverage, fixNext, sources, tighten, provenance, sessionId, handleEnvelope],
  );

  return (
    <div className="workspace-grid">
      <SourceRail sources={workspaceProps.sources} />
      <Chat
        fixNext={workspaceProps.fixNext}
        sessionId={workspaceProps.sessionId}
        onEnvelope={workspaceProps.onEnvelope}
        onSourcesUpdate={workspaceProps.onSourcesUpdate}
      />
      <CoveragePanel coverage={workspaceProps.coverage} />
    </div>
  );
}
