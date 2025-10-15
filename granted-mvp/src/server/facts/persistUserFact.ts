"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { hashCanonical } from "@/server/ingestion/rfpFacts";
import type { AnswerKind } from "@/lib/dod";

function buildValueJson(answerKind: AnswerKind, valueText: string): Record<string, unknown> | null {
  if (answerKind === "date") {
    const parsed = Date.parse(valueText);
    if (!Number.isNaN(parsed)) {
      return {
        iso: new Date(parsed).toISOString(),
        raw: valueText,
      };
    }
  }
  if (answerKind === "url") {
    try {
      const url = new URL(valueText.trim());
      return { href: url.toString(), raw: valueText.trim() };
    } catch {
      return { raw: valueText };
    }
  }
  return null;
}

export interface PersistUserFactInput {
  sessionId: string;
  slotId: string;
  valueText: string;
  answerKind: AnswerKind;
  annotations?: Record<string, unknown> | null;
}

export async function persistUserFact({
  sessionId,
  slotId,
  valueText,
  answerKind,
  annotations,
}: PersistUserFactInput): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const trimmed = valueText.trim();
  if (!trimmed) {
    throw new Error("valueText cannot be empty");
  }

  const valueJson = buildValueJson(answerKind, trimmed);
  const hash = hashCanonical(slotId, trimmed, valueJson, annotations ?? null);

  const payload = {
    session_id: sessionId,
    slot_id: slotId,
    value_text: trimmed,
    value_json: valueJson,
    confidence: 0.95,
    evidence_file_id: null,
    evidence_page: null,
    evidence_snippet: null,
    evidence_href: null,
    evidence_offsets: null,
    hash,
    annotations: annotations ?? null,
    source: "user",
  };

  const { data, error } = await supabase
    .from("rfp_facts")
    .upsert(payload, { onConflict: "session_id,slot_id,hash" })
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  const factId = data?.id;
  if (!factId) {
    return;
  }

  const { error: eventError } = await supabase.from("rfp_facts_events").insert({
    fact_id: factId,
    session_id: sessionId,
    kind: "ingested",
    payload: {
      slot_id: slotId,
      source: "user",
      value_text: trimmed,
      value_json: valueJson,
      annotations: annotations ?? null,
    },
  });

  if (eventError) {
    console.warn("[persistUserFact] failed to insert event", { eventError, factId });
  }
}
