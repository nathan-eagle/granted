import { notFound } from "next/navigation"

import PageShell from "@/components/layout/PageShell"
import AgentWorkspace from "@/components/agent/AgentWorkspace"
import { prisma } from "@/lib/prisma"
import { ensureProjectAgentSession } from "@/lib/agent/sessions"
import { buildDraftFromProject } from "@/lib/agent/draft"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AgentProjectPage({ params }: { params: { projectId: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: {
      id: true,
      name: true,
      agentSessionId: true,
      meta: true,
      coverageJson: true,
      uploads: {
        orderBy: { createdAt: "desc" },
        select: { id: true, filename: true, kind: true, openAiFileId: true },
      },
      sections: {
        orderBy: { order: "asc" },
        select: { id: true, key: true, title: true, contentMd: true, formatLimits: true, contentJson: true },
      },
    },
  })

  if (!project) {
    notFound()
  }

  const session = await ensureProjectAgentSession(project.id)
  const projectMeta = project.meta && typeof project.meta === "object" && !Array.isArray(project.meta) ? (project.meta as Record<string, unknown>) : {}
  const initialDraft = buildDraftFromProject({
    id: project.id,
    meta: project.meta,
    coverageJson: project.coverageJson,
    sections: project.sections.map(section => ({
      key: section.key,
      title: section.title,
      contentMd: section.contentMd ?? null,
      formatLimits: section.formatLimits ?? null,
      contentJson: section.contentJson ?? null,
    })),
  })

  return (
    <PageShell>
      <AgentWorkspace
        projectId={project.id}
        projectName={project.name}
        initialSessionId={session.id}
        initialUploads={project.uploads}
        initialDraft={initialDraft}
        initialAllowWebSearch={Boolean(projectMeta?.allowWebSearch)}
        initialOrgUrl={typeof projectMeta?.orgUrl === "string" ? projectMeta.orgUrl : typeof projectMeta?.orgSite === "string" ? projectMeta.orgSite : ""}
        initialIdea={typeof projectMeta?.projectIdea === "string" ? projectMeta.projectIdea : typeof projectMeta?.idea === "string" ? projectMeta.idea : ""}
      />
    </PageShell>
  )
}
