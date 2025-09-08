import React from 'react'

function isListItem(line: string) {
  return /^\s*(?:[-•*]|\d+\.)\s+/.test(line)
}

function normalizeItem(line: string) {
  return line.replace(/^\s*(?:[-•*]|\d+\.)\s+/, '').trim()
}

export function renderTextBlocks(paragraphs: string[]) {
  const elements: React.ReactNode[] = []
  paragraphs.forEach((block, idx) => {
    const lines = block.split(/\n+/).map(s => s.trim()).filter(Boolean)
    const listLines = lines.filter(isListItem)
    if (listLines.length >= 2) {
      elements.push(
        <ul key={`ul-${idx}`} className="list-disc pl-5">
          {listLines.map((l, i) => <li key={i}>{normalizeItem(l)}</li>)}
        </ul>
      )
    } else {
      elements.push(<p key={`p-${idx}`}>{block}</p>)
    }
  })
  return elements
}

