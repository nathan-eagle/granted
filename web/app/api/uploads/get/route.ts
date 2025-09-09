import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = String(searchParams.get('id') || '')
    const mode = String(searchParams.get('mode') || '')
    const limit = Math.max(500, Math.min(50000, Number(searchParams.get('limit') || 4000)))
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const u = await prisma.upload.findUnique({ where: { id } })
    if (!u) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const text = String(u.text || '')

    if (mode === 'pages') {
      let pages: string[] = []
      if (text.includes('\f')) {
        pages = text.split('\f')
      } else {
        // Heuristic: split by two or more newlines; pack into ~1500-2000 char chunks
        const paras = text.split(/\n{2,}/)
        let buf = ''
        for (const p of paras) {
          if ((buf + '\n\n' + p).length > 1800) {
            if (buf.trim()) pages.push(buf.trim())
            buf = p
          } else {
            buf = buf ? buf + '\n\n' + p : p
          }
        }
        if (buf.trim()) pages.push(buf.trim())
        if (!pages.length) pages = [text]
      }
      // apply length cap per page
      pages = pages.map(p => p.slice(0, limit))
      return NextResponse.json({ id: u.id, filename: u.filename, pages, count: pages.length })
    }

    return NextResponse.json({ id: u.id, filename: u.filename, text: text.slice(0, limit) })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}

