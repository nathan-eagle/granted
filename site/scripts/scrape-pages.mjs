// Scrape live Bubble pages with Playwright (Chromium) and save visible text.
import fs from 'fs/promises'
import path from 'path'
import { chromium } from 'playwright'

const BASE = 'https://grantedai.com'
const PAGES = ['/', '/features', '/pricing', '/faq', '/tech', '/contact']
const OUT_DIR = path.join(process.cwd(), 'scraped')

function slugFor(p) {
  if (p === '/' || p === '') return 'home'
  return p.replace(/^\//, '').replace(/\/$/, '')
}

function visible(el) {
  const style = window.getComputedStyle(el)
  if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity || '1') === 0) return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' })
  for (const route of PAGES) {
    const url = BASE + route
    const slug = slugFor(route)
    const page = await context.newPage()
    console.log('Scraping', url)
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
    // Give Bubble a moment to render
    await page.waitForTimeout(2500)

    const data = await page.evaluate(() => {
      const getMeta = (name) => document.querySelector(`meta[name="${name}"]`)?.content || null
      // Collect visible text nodes by block: using element innerText of large containers
      function visible(el) {
        const style = window.getComputedStyle(el)
        if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity || '1') === 0) return false
        const rect = el.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      }
      function collectBlocks(root) {
        const blocks = []
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
        while (walker.nextNode()) {
          const el = walker.currentNode
          if (!(el instanceof HTMLElement)) continue
          const tag = el.tagName.toLowerCase()
          if (['script','style','noscript','svg','path','nav','header','footer'].includes(tag)) continue
          // skip very small or container-only nodes
          if (!visible(el)) continue
          const text = el.innerText?.trim() || ''
          const length = text.replace(/\s+/g,' ').length
          if (length >= 80) {
            blocks.push({ tag, length, text })
          }
        }
        // dedupe by text and keep top blocks by length
        const seen = new Set()
        const unique = []
        for (const b of blocks.sort((a,b)=>b.length-a.length)) {
          const key = b.text.slice(0,200)
          if (seen.has(key)) continue
          seen.add(key)
          unique.push(b)
          if (unique.length >= 8) break
        }
        // sort back to DOM order by first occurrence
        unique.sort((a,b)=> document.body.innerText.indexOf(a.text.slice(0,60)) - document.body.innerText.indexOf(b.text.slice(0,60)))
        return unique
      }
      return {
        title: document.title || null,
        description: getMeta('description'),
        url: location.href,
        blocks: collectBlocks(document.body),
      }
    })

    const out = path.join(OUT_DIR, `${slug}.json`)
    await fs.writeFile(out, JSON.stringify(data, null, 2), 'utf8')
    await page.close()
    console.log('Saved', out)
  }
  await context.close()
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
