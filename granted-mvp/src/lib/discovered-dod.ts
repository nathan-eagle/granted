export type SatisfactionPolicy = "requires_evidence" | "user_affirmation_ok" | "either";

export interface DiscoveredEvidenceAnchor {
  sourceId?: string;
  page?: number;
  heading?: string;
  quote?: string;
  href?: string;
}

export interface DiscoveredSlot {
  slotId: string;
  label: string;
  requiredness: "must" | "should" | "conditional";
  type: "text" | "date" | "money" | "enum" | "file" | "email" | "url";
  enum?: string[];
  constraints?: Record<string, unknown>;
  condition?: string | null;
  evidence?: DiscoveredEvidenceAnchor[];
  satisfactionPolicy: SatisfactionPolicy;
  aliases?: string[];
}

export interface DiscoveredSection {
  id: string;
  label: string;
  order?: number;
  evidence?: DiscoveredEvidenceAnchor[];
  slots: DiscoveredSlot[];
}

export interface DiscoveredDoD {
  version: number;
  sections: DiscoveredSection[];
}

export interface SourceFingerprint {
  id: string;
  name: string;
  bytes?: number | null;
  etag?: string | null;
  pageCount?: number | null;
}
