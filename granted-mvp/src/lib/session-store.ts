import { randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import {
  getSupabaseAdmin,
  type DbAppUser,
  type DbDraftRow,
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
  SectionStatus,
  SourceAttachment,
  TightenSectionSnapshot,
} from "./types";

export const SESSION_COOKIE = "granted_session_id";
export const PROJECT_COOKIE = "granted_project_id";

const INITIAL_ASSISTANT_MESSAGE =
  "Hi! I’m your grant assistant. Paste the RFP URL (or drag the PDF here), then share your org URL and a 3-5 sentence project idea so I can map coverage and suggest what to tackle next.";

export interface SessionState {
  sessionId: string;
  projectId: string;
  projectTitle: string;
  appUserId: string | null;
  appUserEmail: string | null;
  messages: ChatMessage[];
  sources: SourceAttachment[];
  coverage: CoverageSnapshot | null;
  fixNext: FixNextSuggestion | null;
  tighten: TightenSectionSnapshot | null;
  provenance: ProvenanceSnapshot | null;
}

export interface EnsureSessionOptions {
  sessionIdFromClient?: string | null;
  projectIdFromClient?: string | null;
  authUserId?: string | null;
  authEmail?: string | null;
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
    id: row.openai_file_id ?? row.id,
    label: row.label,
    kind: row.kind,
    href: row.href ?? undefined,
  };
}

export async function ensureAppUser(authUserId: string, email?: string | null): Promise<DbAppUser> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    if (email && data.email !== email) {
      await supabase.from("profiles").update({ email }).eq("id", data.id);
      return { ...data, email };
    }
    return data;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: authUserId,
      email: email ?? null,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    throw insertError ?? new Error("Failed to create app user");
  }

  return inserted;
}

async function fetchProjectById(projectId: string): Promise<DbProject | null> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (error) {
    throw error;
  }
  return data ?? null;
}

async function ensureProjectOwner(project: DbProject, ownerId: string | null): Promise<DbProject> {
  if (!ownerId || project.owner_id === ownerId) {
    return project;
  }

  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .update({ owner_id: ownerId })
    .eq("id", project.id)
    .select()
    .single();
  if (error || !data) {
    throw error ?? new Error("Failed to assign project owner");
  }
  return data;
}

async function createProject(ownerId?: string | null, name?: string | null): Promise<DbProject> {
  const supabase = await getSupabaseAdmin();
  const insertPayload: Partial<DbProject> = {
    name: name ?? undefined,
    owner_id: ownerId ?? undefined,
  };
  const { data, error } = await supabase
    .from("projects")
    .insert(insertPayload)
    .select()
    .single();
  if (error || !data) {
    throw error ?? new Error("Failed to create project");
  }
  return data;
}

async function createSession(projectId: string, explicitSessionId?: string): Promise<DbSession> {
  const supabase = await getSupabaseAdmin();
  const sessionInsert = explicitSessionId ? { id: explicitSessionId, project_id: projectId } : { project_id: projectId };
  const { data: session, error: sessionError } = await supabase.from("sessions").insert(sessionInsert).select().single();
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

  return session;
}

async function createProjectAndSession(options: {
  ownerId?: string | null;
  explicitSessionId?: string | null;
  name?: string | null;
}): Promise<{ project: DbProject; session: DbSession }> {
  const project = await createProject(options.ownerId ?? null, options.name ?? null);
  const session = await createSession(project.id, options.explicitSessionId ?? undefined);
  return { project, session };
}

async function buildSessionState(
  session: DbSession,
  project: DbProject,
  appUser?: DbAppUser | null,
): Promise<SessionState> {
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
        score: coverageRow.score ?? 0,
        summary:
          coverageRow.summary ??
          `Coverage ${(coverageRow.score ?? 0) * 100}%`,
        slots: (coverageRow.slots as CoverageSnapshot["slots"]) ?? [],
        updatedAt: new Date(coverageRow.created_at).getTime(),
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

  const effectiveAppUser = appUser ?? (project.owner_id ? { id: project.owner_id, email: null, auth_user_id: null, created_at: "" } : null);

  return {
    sessionId: session.id,
    projectId: project.id,
    projectTitle: project.name ?? "Untitled project",
    appUserId: effectiveAppUser?.id ?? null,
    appUserEmail: effectiveAppUser?.email ?? null,
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

export async function ensureSession(options: EnsureSessionOptions = {}): Promise<SessionState> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  let sessionId =
    options.sessionIdFromClient ??
    cookieStore.get(SESSION_COOKIE)?.value ??
    headerStore.get("x-granted-session") ??
    null;
  let projectId =
    options.projectIdFromClient ??
    cookieStore.get(PROJECT_COOKIE)?.value ??
    headerStore.get("x-granted-project") ??
    null;

  const authUserId = options.authUserId ?? null;
  const authEmail = options.authEmail ?? null;
  const appUser = authUserId ? await ensureAppUser(authUserId, authEmail) : null;

  let session: DbSession | null = null;
  let project: DbProject | null = null;

  if (sessionId) {
    const result = await fetchSessionAndProject(sessionId);
    if (result) {
      session = result.session;
      project = await ensureProjectOwner(result.project, appUser?.id ?? null);
      projectId = project.id;
    } else {
      sessionId = null;
    }
  }

  if (!project && projectId) {
    const fetchedProject = await fetchProjectById(projectId);
    if (fetchedProject) {
      project = await ensureProjectOwner(fetchedProject, appUser?.id ?? null);
    } else {
      projectId = null;
    }
  }

  if (!session && project) {
    session = await createSession(project.id, sessionId ?? undefined);
    sessionId = session.id;
  }

  if (!session || !project) {
    const generatedSessionId = sessionId ?? randomUUID();
    const created = await createProjectAndSession({
      ownerId: appUser?.id ?? null,
      explicitSessionId: generatedSessionId,
    });
    project = created.project;
    session = created.session;
    sessionId = session.id;
    projectId = project.id;
  }

  return buildSessionState(session, project, appUser);
}

export async function loadSession(sessionId: string): Promise<SessionState | null> {
  const result = await fetchSessionAndProject(sessionId);
  if (!result) {
    return null;
  }
  return buildSessionState(result.session, result.project, null);
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
  runId?: string | null;
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
    run_id: payload.runId ?? null,
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
      id: source.id,
      session_id: sessionId,
      label: source.label,
      kind: source.kind,
      href: source.href ?? null,
      openai_file_id: source.kind === "file" ? source.id : null,
      content_hash: source.meta?.hash ?? null,
    }));
    const { error: sourcesError } = await supabase.from("sources").upsert(rows, {
      onConflict: "id",
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
    id: source.id,
    session_id: sessionId,
    label: source.label,
    kind: source.kind,
    href: source.href ?? null,
    openai_file_id: source.kind === "file" ? source.id : null,
    content_hash: source.meta?.hash ?? null,
  }));
  const { error } = await supabase.from("sources").upsert(rows, {
    onConflict: "id",
  });
  if (error) {
    console.error("Failed to persist sources", error);
  }
}

export async function loadDraftMarkdown(sessionId: string, sectionId: string): Promise<string | null> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("section_drafts")
    .select("markdown")
    .eq("session_id", sessionId)
    .eq("section_id", sectionId)
    .maybeSingle();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Failed to load draft", error);
    }
    return null;
  }

  return (data as Pick<DbDraftRow, "markdown"> | null)?.markdown ?? null;
}

export async function upsertDraftMarkdown(
  sessionId: string,
  sectionId: string,
  markdown: string,
  status: SectionStatus = "partial",
): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("section_drafts").upsert(
    {
      session_id: sessionId,
      section_id: sectionId,
      markdown,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id, section_id" },
  );

  if (error) {
    throw error;
  }
}

export async function saveCoverageSnapshot(sessionId: string, snapshot: CoverageSnapshot): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("coverage_snapshots").insert({
    session_id: sessionId,
    score: snapshot.score,
    summary: snapshot.summary,
    slots: snapshot.slots,
  });
  if (error) {
    console.error("Failed to insert coverage snapshot", error);
  }
}

export async function listProjectsForOwner(ownerId: string): Promise<DbProject[]> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function createProjectForOwner(ownerId: string, name: string): Promise<DbProject> {
  return createProject(ownerId, name);
}

export async function createSessionForProject(projectId: string, explicitSessionId?: string): Promise<DbSession> {
  return createSession(projectId, explicitSessionId);
}
