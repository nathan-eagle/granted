#!/usr/bin/env node

import { promises as fs } from 'fs'
import path from 'path'
import url from 'url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const source = path.resolve(__dirname, '../../../web/node_modules/@openai/agents/dist/index.d.ts')
const target = path.resolve(__dirname, '../../types/generated/agentkit/index.d.ts')

async function main() {
  try {
    await fs.access(source)
  } catch (error) {
    console.error('Unable to locate @openai/agents types at', source)
    process.exit(1)
  }

  await fs.mkdir(path.dirname(target), { recursive: true })
  const header = `// Auto-generated from @openai/agents on ${new Date().toISOString()}\n// Regenerate via \`npm run agentkit:types\`.\n\n`
  const contents = await fs.readFile(source, 'utf8')
  await fs.writeFile(target, `${header}${contents}`, 'utf8')
  console.log('Wrote AgentKit type snapshot to', target)
}

main()
