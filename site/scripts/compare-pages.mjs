// Compare Bubble site vs Vercel site with screenshots and pixel diffs
import fs from 'fs/promises'
import path from 'path'
import { chromium } from 'playwright'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

const OLD = process.env.OLD_ORIGIN || 'https://grantedai.com'
const NEW = process.env.NEW_ORIGIN || 'https://granted-website.vercel.app'
const PAGES = ['/', '/features', '/pricing', '/faq', '/tech', '/contact']
const OUT = path.join(process.cwd(), 'compare')

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }) }

async function shot(page, url, file) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1500)
  await page.setViewportSize({ width: 1440, height: 1200 })
  await page.screenshot({ path: file, fullPage: true })
}

async function diffImages(aFile, bFile, outFile) {
  const a = PNG.sync.read(await fs.readFile(aFile))
  const b = PNG.sync.read(await fs.readFile(bFile))
  const w = Math.min(a.width, b.width)
  const h = Math.min(a.height, b.height)
  const aCrop = new PNG({ width: w, height: h })
  const bCrop = new PNG({ width: w, height: h })
  PNG.bitblt(a, aCrop, 0, 0, w, h, 0, 0)
  PNG.bitblt(b, bCrop, 0, 0, w, h, 0, 0)
  const diff = new PNG({ width: w, height: h })
  const mismatched = pixelmatch(aCrop.data, bCrop.data, diff.data, w, h, { threshold: 0.1 })
  await fs.writeFile(outFile, PNG.sync.write(diff))
  return { mismatched, total: w * h, pct: mismatched / (w * h) }
}

async function main() {
  await ensureDir(OUT)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const results = []
  for (const p of PAGES) {
    const slug = p === '/' ? 'home' : p.replace(/^\//,'')
    const oldShot = path.join(OUT, `${slug}-old.png`)
    const newShot = path.join(OUT, `${slug}-new.png`)
    const diffShot = path.join(OUT, `${slug}-diff.png`)
    console.log('Capture', p)
    await shot(page, OLD + p, oldShot)
    await shot(page, NEW + p, newShot)
    const r = await diffImages(oldShot, newShot, diffShot)
    results.push({ page: p, ...r })
    console.log(`${p}: ${(r.pct*100).toFixed(2)}% different -> ${diffShot}`)
  }
  await browser.close()
  await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })

