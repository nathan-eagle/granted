import type {
  CoverageSnapshot,
  FixNextSuggestion,
  SourceAttachment,
  TightenSectionSnapshot,
  ProvenanceSnapshot,
} from "./types";

export interface GrantAgentContext {
  sessionId: string;
  vectorStoreId: string;
  coverage?: CoverageSnapshot;
  fixNext?: FixNextSuggestion | null;
  sources?: SourceAttachment[];
  tighten?: TightenSectionSnapshot;
  provenance?: ProvenanceSnapshot;
}
