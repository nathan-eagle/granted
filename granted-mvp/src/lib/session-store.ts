"use server";

import { cookies } from "next/headers";
import {
  getSupabaseAdmin,
  type DbMessageRow,
  type DbProject,
  type DbSession,
  type DbSourceRow,
} from "./supabase";
import type {
  ChatMessage,
  CoverageSnapshot,
  FixNextSuggestion,
  ProvenanceSnapshot,
  SourceAttachment,
  TightenSectionSnapshot,
} from "./types";

const SESSION_COOKIE = "granted_session_id";

const INITIAL_ASSISTANT_MESSAGE =
  "Hi! I’m your grant assistant. Paste the RFP URL (or drag the PDF here), then share your org URL and a 3-5 sentence project idea so I can map coverage and suggest what to tackle next.";

export interface SessionState {
  sessionId: string;
  projectId: string;
  messages: ChatMessage[];
  sources: SourceAttachment[];
  coverage: CoverageSnapshot | null;
  fixNext: FixNextSuggestion | null;
  tighten: TightenSectionSnapshot | null;
  provenance: ProvenanceSnapshot | null;
}

function convertMessageRow(row: DbMessageRow): ChatMessage {
  return {
    id: String(row.id),
    role: row.role as ChatMessage["role"],
    content: row.content,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function convertSourceRow(row: DbSourceRow): SourceAttachment {
  return {
    id: row.openai_file_id,
    label: row.label,
    kind: row.kind,
    href: row.href ?? undefined,
  };
}

async function insertInitialSession(): Promise<{ project: DbProject; session: DbSession }> {
  const supabase = await getSupabaseAdmin();
  const { data: project, error: projectError } = await supabase.from("projects").insert({}).select().single();
  if (projectError || !project) {
    throw projectError ?? new Error("Failed to create project");
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({ project_id: project.id })
    .select()
    .single();
  if (sessionError || !session) {
    throw sessionError ?? new Error("Failed to create session");
  }

  const { error: messageError } = await supabase.from("messages").insert({
    session_id: session.id,
    role: "assistant",
    content: INITIAL_ASSISTANT_MESSAGE,
  });
  if (messageError) {
    throw messageError;
  }

  return { project, session };
}

async function buildSessionState(session: DbSession, project: DbProject): Promise<SessionState> {
  const supabase = await getSupabaseAdmin();

  const { data: messageRows } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });
  const messages = (messageRows ?? []).map(convertMessageRow);

  const { data: sourceRows } = await supabase
    .from("sources")
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });
  const sources = (sourceRows ?? []).map(convertSourceRow);

  const { data: coverageRow } = await supabase
    .from("coverage_snapshots")
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const coverage = coverageRow
    ? ({
        ...(coverageRow.payload as CoverageSnapshot),
        score: Number(coverageRow.score),
        summary: coverageRow.summary ?? (coverageRow.payload as CoverageSnapshot).summary,
      } satisfies CoverageSnapshot)
    : null;

  const { data: tightenRow } = await supabase
    .from("tighten_snapshots")
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const tighten = tightenRow ? (tightenRow.payload as TightenSectionSnapshot) : null;

  const { data: provenanceRow } = await supabase
    .from("provenance_snapshots")
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const provenance = provenanceRow ? (provenanceRow.payload as ProvenanceSnapshot) : null;

  let fixNext: FixNextSuggestion | null = null;
  const lastAssistantEnvelope = [...(messageRows ?? [])]
    .reverse()
    .find((row) => row.role === "assistant" && row.envelope);
  if (lastAssistantEnvelope?.envelope && typeof lastAssistantEnvelope.envelope === "object") {
    const raw = (lastAssistantEnvelope.envelope as Record<string, unknown>).fixNext;
    if (raw && typeof raw === "object") {
      fixNext = raw as FixNextSuggestion;
    }
  }

  return {
    sessionId: session.id,
    projectId: project.id,
    messages,
    sources,
    coverage,
    fixNext,
    tighten,
    provenance,
  };
}

async function fetchSessionAndProject(sessionId: string): Promise<{ session: DbSession; project: DbProject } | null> {
  const supabase = await getSupabaseAdmin();
  const { data: session } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) {
    return null;
  }
  const { data: project } = await supabase.from("projects").select("*").eq("id", session.project_id).maybeSingle();
  if (!project) {
    return null;
  }
  return { session, project };
}

export async function ensureSession(sessionIdFromClient?: string): Promise<SessionState> {
  const cookieStore = await cookies();
  let sessionId = sessionIdFromClient ?? cookieStore.get(SESSION_COOKIE)?.value ?? null;

  let session: DbSession | null = null;
  let project: DbProject | null = null;

  if (sessionId) {
    const result = await fetchSessionAndProject(sessionId);
    if (result) {
      session = result.session;
      project = result.project;
    } else {
      sessionId = null;
    }
  }

  if (!session || !project) {
    const created = await insertInitialSession();
    session = created.session;
    project = created.project;
    sessionId = session.id;
    cookieStore.set({
      name: SESSION_COOKIE,
      value: sessionId,
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return buildSessionState(session, project);
}

export async function loadSession(sessionId: string): Promise<SessionState | null> {
  const result = await fetchSessionAndProject(sessionId);
  if (!result) return null;
  return buildSessionState(result.session, result.project);
}

export async function persistUserMessage(sessionId: string, content: string): Promise<ChatMessage> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      session_id: sessionId,
      role: "user",
      content,
    })
    .select()
    .single();
  if (error || !data) {
    throw error ?? new Error("Failed to store user message");
  }
  return convertMessageRow(data);
}

interface AssistantPersistencePayload {
  content: string;
  coverage?: CoverageSnapshot | null;
  fixNext?: FixNextSuggestion | null;
  sources?: SourceAttachment[];
  tighten?: TightenSectionSnapshot | null;
  provenance?: ProvenanceSnapshot | null;
}

export async function persistAssistantTurn(sessionId: string, payload: AssistantPersistencePayload): Promise<void> {
  const supabase = await getSupabaseAdmin();

  const { error: messageError } = await supabase.from("messages").insert({
    session_id: sessionId,
    role: "assistant",
    content: payload.content,
    envelope: {
      coverage: payload.coverage ?? null,
      fixNext: payload.fixNext ?? null,
      sources: payload.sources ?? [],
      tighten: payload.tighten ?? null,
      provenance: payload.provenance ?? null,
    },
  });
  if (messageError) {
    throw messageError;
  }

  if (payload.coverage) {
    const { error: coverageError } = await supabase.from("coverage_snapshots").insert({
      session_id: sessionId,
      score: payload.coverage.score,
      summary: payload.coverage.summary,
      payload: payload.coverage,
    });
    if (coverageError) {
      console.error("Failed to insert coverage snapshot", coverageError);
    }
  }

  if (payload.tighten) {
    const { error: tightenError } = await supabase.from("tighten_snapshots").insert({
      session_id: sessionId,
      within_limit: payload.tighten.withinLimit,
      word_estimate: payload.tighten.wordCount,
      page_estimate: payload.tighten.pageEstimate,
      payload: payload.tighten,
    });
    if (tightenError) {
      console.error("Failed to insert tighten snapshot", tightenError);
    }
  }

  if (payload.provenance) {
    const { error: provenanceError } = await supabase.from("provenance_snapshots").insert({
      session_id: sessionId,
      total_paragraphs: payload.provenance.totalParagraphs,
      paragraphs_with_provenance: payload.provenance.paragraphsWithProvenance,
      payload: payload.provenance,
    });
    if (provenanceError) {
      console.error("Failed to insert provenance snapshot", provenanceError);
    }
  }

  if (payload.sources && payload.sources.length > 0) {
    const rows = payload.sources.map((source) => ({
      session_id: sessionId,
      label: source.label,
      kind: source.kind,
      href: source.href ?? null,
      openai_file_id: source.id,
    }));
    const { error: sourcesError } = await supabase.from("sources").upsert(rows, {
      onConflict: "session_id, openai_file_id",
    });
    if (sourcesError) {
      console.error("Failed to upsert sources", sourcesError);
    }
  }

  const { error: projectUpdateError } = await supabase.rpc("touch_project_for_session", {
    target_session_id: sessionId,
  });
  if (projectUpdateError && projectUpdateError.code !== "42883") {
    console.error("Failed to touch project timestamp", projectUpdateError);
  }
}

export async function persistSources(sessionId: string, sources: SourceAttachment[]): Promise<void> {
  if (sources.length === 0) return;
  const supabase = await getSupabaseAdmin();
  const rows = sources.map((source) => ({
    session_id: sessionId,
    label: source.label,
    kind: source.kind,
    href: source.href ?? null,
    openai_file_id: source.id,
  }));
  const { error } = await supabase.from("sources").upsert(rows, {
    onConflict: "session_id, openai_file_id",
  });
  if (error) {
    console.error("Failed to persist sources", error);
  }
}
