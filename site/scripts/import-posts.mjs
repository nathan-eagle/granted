import fs from 'fs/promises'
import path from 'path'

let TurndownService
try {
  // optional; only used when importing HTML
  const mod = await import('turndown')
  TurndownService = mod.default || mod
} catch {}

const SRC = process.argv[2]
if (!SRC) {
  console.error('Usage: npm run import:posts -- \\path\\to\\export_dir')
  process.exit(1)
}

const OUT_DIR = path.join(process.cwd(), 'content', 'blog')
await fs.mkdir(OUT_DIR, { recursive: true })

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function* walk(dir) {
  for (const d of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name)
    if (d.isDirectory()) yield* walk(p)
    else yield p
  }
}

function frontmatter({ title, description, date }) {
  const lines = ['---']
  if (title) lines.push(`title: ${JSON.stringify(title)}`)
  if (description) lines.push(`description: ${JSON.stringify(description)}`)
  if (date) lines.push(`date: ${new Date(date).toISOString().slice(0,10)}`)
  lines.push('---', '')
  return lines.join('\n')
}

async function writePost(slug, meta, content) {
  const out = path.join(OUT_DIR, `${slug}.mdx`)
  const fm = frontmatter(meta)
  await fs.writeFile(out, fm + content)
  console.log('Imported', slug)
}

async function importFile(file) {
  const ext = path.extname(file).toLowerCase()
  const base = path.basename(file, ext)
  const slug = slugify(base)
  const raw = await fs.readFile(file, 'utf8')

  if (ext === '.md' || ext === '.mdx') {
    return writePost(slug, { title: base }, raw)
  }
  if (ext === '.json') {
    try {
      const data = JSON.parse(raw)
      if (Array.isArray(data)) {
        for (const p of data) {
          if (!p.slug) continue
          await writePost(String(p.slug), { title: p.title, description: p.description, date: p.date }, String(p.content || ''))
        }
        return
      }
      if (data.slug) {
        await writePost(String(data.slug), { title: data.title, description: data.description, date: data.date }, String(data.content || ''))
        return
      }
    } catch {}
  }
  if ((ext === '.html' || ext === '.htm') && TurndownService) {
    const turndown = new TurndownService()
    const md = turndown.turndown(raw)
    return writePost(slug, { title: base }, md)
  }
}

for await (const file of walk(SRC)) {
  await importFile(file).catch((e) => console.warn('Skip', file, e.message))
}

