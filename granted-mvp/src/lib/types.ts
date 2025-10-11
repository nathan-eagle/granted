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
  kind: "question" | "upload" | "url" | "tighten";
}

export interface CoverageSlot {
  id: string;
  label: string;
  status: "complete" | "partial" | "missing";
  notes?: string;
}

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

export interface AgentRunEnvelope {
  message: string;
  fixNext?: FixNextSuggestion | null;
  coverage?: CoverageSnapshot | null;
  sources?: SourceAttachment[];
  tighten?: TightenSectionSnapshot | null;
  provenance?: ProvenanceSnapshot | null;
}

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
