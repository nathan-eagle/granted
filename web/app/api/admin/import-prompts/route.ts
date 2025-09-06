import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const text = await req.text()
  const records = parse(text, { columns: true, skip_empty_lines: true }) as any[]

  // Expect columns similar to your export: about, category, emoji, icon, language_model, order, prompt, unique id
  let created = 0
  for (const r of records) {
    const categoryName = (r.category || 'Uncategorized').trim()
    let cat = await prisma.templateCategory.findFirst({
      where: { name: categoryName }
    })
    if (!cat) {
      cat = await prisma.templateCategory.create({
        data: { name: categoryName }
      })
    }

    const slug = slugify(r.title || r["title"] || r["Template"] || (r["unique id"] || '').toString() || (r["about"] || '').slice(0, 32))
    const tmpl = await prisma.template.upsert({
      where: { slug },
      update: {
        title: r.title || slug,
        about: r.about || null,
        prompt: r.prompt || r["Prompt"] || '',
        model: r.language_model || 'gpt-4o-mini',
        order: Number(r.order || 0),
        emoji: r.emoji || null,
        icon: r.icon || null,
        categoryId: cat.id,
      },
      create: {
        slug,
        title: r.title || slug,
        about: r.about || null,
        prompt: r.prompt || r["Prompt"] || '',
        model: r.language_model || 'gpt-4o-mini',
        order: Number(r.order || 0),
        emoji: r.emoji || null,
        icon: r.icon || null,
        categoryId: cat.id,
      },
    })

    // Extract qNinput tokens and make fields if not exist
    const tokens = Array.from(new Set(String(tmpl.prompt).match(/q\d+input/g) || []))
    for (let i = 0; i < tokens.length; i++) {
      const key = tokens[i]
      const label = guessLabelAroundPrompt(tmpl.prompt, key)
      await prisma.templateField.upsert({
        where: { templateId_key: { templateId: tmpl.id, key } },
        update: { label, order: i },
        create: { templateId: tmpl.id, key, label, order: i, type: 'long' },
      })
    }
    created++
  }

  return NextResponse.json({ ok: true, count: created })
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `template-${Math.random().toString(36).slice(2)}`
}

function guessLabelAroundPrompt(prompt: string, key: string) {
  // Try to find a surrounding [Label]: ```key```
  const re = new RegExp("\\[([^\\]]+)\\][^\n]*```" + key + "```")
  const m = prompt.match(re)
  if (m && m[1]) return m[1]
  // Fallback: title case of key
  return key.replace(/q(\d+)input/, 'Field $1')
}

