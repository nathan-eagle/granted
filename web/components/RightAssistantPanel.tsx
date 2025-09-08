import TopFixes from '@/components/TopFixes'

type Cite = { sectionKey: string; sectionTitle: string; n: number; text: string; filename?: string }

export default function RightAssistantPanel({ projectId, fixes, citations }: { projectId: string; fixes: any[]; citations?: Cite[] }){
  const cites = citations || []
  const grouped = cites.reduce<Record<string, { title: string; items: Cite[] }>>((acc, c) => {
    const k = c.sectionKey
    if (!acc[k]) acc[k] = { title: c.sectionTitle, items: [] }
    acc[k].items.push(c)
    return acc
  }, {})
  return (
    <aside style={{position:'sticky', top:16}}>
      <div style={{fontWeight:700, marginBottom:8}}>Assistant</div>
      {fixes?.length ? (
        <div style={{marginBottom:12}}>
          <div style={{fontWeight:600, marginBottom:6}}>Top Fixes</div>
          <TopFixes projectId={projectId} fixes={fixes} />
        </div>
      ) : null}
      <div>
        <div style={{fontWeight:600, marginBottom:6}}>Citations</div>
        {cites.length ? (
          <div style={{fontSize:12, color:'#6b7280'}}>
            {Object.entries(grouped).map(([key, g]) => (
              <div key={key} style={{marginBottom:8}}>
                <div style={{fontWeight:600, color:'#374151'}}><a href={`#sec-${key}`} style={{textDecoration:'none'}}>{g.title}</a></div>
                <ul style={{paddingLeft:16, marginTop:4}}>
                  {g.items.map((c, i) => (
                    <li key={i}>[{c.n}] {c.text} {c.filename ? `(Source: ${c.filename})` : ''}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div style={{fontSize:12, color:'#6b7280'}}>No citations yet.</div>
        )}
      </div>
    </aside>
  )
}
