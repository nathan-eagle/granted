'use client'

import { useState } from 'react'

export default function ExportToGoogle({ responseId }: { responseId: string }) {
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/exports/google', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Export failed')
      setUrl(data.url)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{marginTop:12}}>
      <button onClick={handleExport} disabled={loading}>{loading ? 'Exporting…' : 'Export to Google Doc'}</button>
      {url && (
        <span style={{marginLeft:12}}>
          <a href={url} target="_blank" rel="noreferrer">Open Google Doc</a>
        </span>
      )}
      {error && <div style={{color:'crimson', marginTop:8}}>{error}</div>}
    </div>
  )
}

