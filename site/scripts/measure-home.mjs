import { chromium } from 'playwright'

const URL = process.env.MEASURE_URL || 'https://grantedai.com/'

async function bestMatchByText(page, text) {
  const handles = await page.$$(`xpath=//*[contains(normalize-space(), ${JSON.stringify(text)})]`)
  let best = null
  let bestSize = 0
  for (const h of handles) {
    const size = await h.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)||0)
    if (size > bestSize) { best = h; bestSize = size }
  }
  return best
}

async function getComputedJSON(page, handle) {
  const box = await handle.boundingBox()
  const styles = await handle.evaluate((el) => {
    const cs = window.getComputedStyle(el)
    return {
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
      fontWeight: cs.fontWeight,
      letterSpacing: cs.letterSpacing,
      marginTop: cs.marginTop,
      marginBottom: cs.marginBottom,
      paddingTop: cs.paddingTop,
      paddingBottom: cs.paddingBottom,
      borderRadius: cs.borderRadius,
      color: cs.color,
      display: cs.display,
      tag: el.tagName,
      text: (el.innerText || '').slice(0, 160)
    }
  })
  return { box, styles }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)

  const headlineTxt = 'You have better things to do with your time'
  const subheadTxt = 'Get your projects funded faster with AI'
  const stepsTxt = '3 Steps To Your Fastest Funding Ever'
  const equityTxt = 'Level the fundraising playing field.'

  const items = []
  for (const [name, txt] of [['heroTitle', headlineTxt], ['heroSub', subheadTxt], ['stepsTitle', stepsTxt], ['equityTitle', equityTxt]]) {
    const h = await bestMatchByText(page, txt)
    if (h) {
      const data = await getComputedJSON(page, h)
      items.push({ name, ...data })
    } else {
      items.push({ name, error: 'not found' })
    }
  }

  // find the 3 step card to measure radius/spacing
  const stepCard = await bestMatchByText(page, 'Create a new project.')
  if (stepCard) {
    const data = await getComputedJSON(page, stepCard)
    items.push({ name: 'stepCard', ...data })
  }

  console.log(JSON.stringify({ url: URL, items }, null, 2))
  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
