export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  pending?: boolean;
}

export interface FixNextSuggestion {
  id: string;
  label: string;
  description?: string;
  kind: "question" | "tighten" | "export";
}

export interface CoverageSlotFact {
  slotId: string;
  valueText: string;
  confidence: number;
  evidence?: RfpFactEvidence | null;
}

export interface CoverageSlot {
  id: string;
  label: string;
  status: "complete" | "partial" | "missing";
  notes?: string;
  facts?: CoverageSlotFact[];
  missingFactSlotIds?: string[];
}

export type SectionStatus = "missing" | "partial" | "complete";

export interface CoverageSnapshot {
  score: number;
  summary: string;
  slots: CoverageSlot[];
  updatedAt: number;
}

export interface SourceAttachment {
  id: string;
  label: string;
  kind: "file" | "url";
  href?: string;
  meta?: Record<string, string | number>;
}

export type AgentRunEnvelope =
  | { type: "message"; delta: string; done?: boolean }
  | { type: "coverage"; coverage: CoverageSnapshot }
  | { type: "fixNext"; fixNext: FixNextSuggestion | null }
  | { type: "sources"; sources: SourceAttachment[] }
  | { type: "tighten"; tighten: TightenSectionSnapshot | null }
  | { type: "provenance"; provenance: ProvenanceSnapshot | null };

export interface UploadResult {
  fileId: string;
  filename: string;
}

export interface TightenSectionSnapshot {
  withinLimit: boolean;
  wordCount: number;
  pageEstimate: number;
  limitWords?: number;
}

export interface ProvenanceSnapshot {
  paragraphsWithProvenance: number;
  totalParagraphs: number;
}

export interface RfpFactEvidence {
  fileId?: string | null;
  page?: number | null;
  snippet?: string | null;
  href?: string | null;
  offsets?: Record<string, unknown> | null;
}

export interface RfpFact {
  id: string;
  sessionId: string;
  slotId: string;
  valueText: string;
  valueJson: Record<string, unknown> | null;
  confidence: number;
  evidence: RfpFactEvidence | null;
  hash: string;
  createdAt: number;
  updatedAt: number;
}
