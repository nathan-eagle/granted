import type { CoverageSnapshot, FixNextSuggestion, SourceAttachment, TightenSectionSnapshot, ProvenanceSnapshot } from "./types";
import type { DiscoveredDoD } from "./discovered-dod";

export interface GrantAgentContext {
  sessionId: string;
  vectorStoreId: string;
  coverage?: CoverageSnapshot;
  fixNext?: FixNextSuggestion | null;
  sources?: SourceAttachment[];
  tighten?: TightenSectionSnapshot;
  provenance?: ProvenanceSnapshot;
  discoveredDoD?: DiscoveredDoD | null;
  dodVersion?: number | null;
  discoveryToast?: { fromVersion?: number | null; toVersion: number };
}
