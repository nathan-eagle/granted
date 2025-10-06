import { prisma } from "@/lib/prisma"

let cachedUserId: string | null = null

export async function getDefaultUserId() {
  if (cachedUserId) return cachedUserId
  const envId = process.env.DEMO_USER_ID
  if (envId) {
    cachedUserId = envId
    return envId
  }
  const existing = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })
  if (existing?.id) {
    cachedUserId = existing.id
    return existing.id
  }
  const user = await prisma.user.create({
    data: {
      name: "Demo User",
      email: null,
    },
    select: { id: true },
  })
  cachedUserId = user.id
  return user.id
}
