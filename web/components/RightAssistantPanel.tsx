import TopFixes from '@/components/TopFixes'

type Cite = { sectionKey: string; sectionTitle: string; n: number; text: string; filename?: string }

export default function RightAssistantPanel({ projectId, fixes, citations }: { projectId: string; fixes: any[]; citations?: Cite[] }){
  const cites = citations || []
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
          <ul style={{fontSize:12, color:'#6b7280', paddingLeft:16}}>
            {cites.map((c, i) => (
              <li key={i}>
                <a href={`#sec-${c.sectionKey}`}>[{c.n}]</a> {c.text} {c.filename ? `(Source: ${c.filename})` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{fontSize:12, color:'#6b7280'}}>No citations yet.</div>
        )}
      </div>
    </aside>
  )
}
