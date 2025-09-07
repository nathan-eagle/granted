import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import NewWizard from '@/components/NewWizard'

function loadPackIds() {
  const dir = path.join(process.cwd(), 'lib/agencyPacks')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  return files.map(f => ({ id: f.replace(/\.json$/, ''), file: f }))
}

export default async function NewProjectPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/api/auth/signin?callbackUrl=/new')
  const packs = loadPackIds()
  const packItems = packs.map(p => ({ ...p, label: p.file.includes('nih') ? 'NIH SBIR Phase I' : 'NSF SBIR Phase I' }))
  return (
    <div>
      <h1>Autowrite my SBIR</h1>
      {/* Client stepper wizard */}
      {/* @ts-expect-error Server-to-client prop */}
      <NewWizard packs={packItems} />
    </div>
  )
}
// POST handler moved to app/new/route.ts
