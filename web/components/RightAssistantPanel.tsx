import TopFixes from '@/components/TopFixes'
import AssistantChat from '@/components/assistant/AssistantChat'
import CharterIntake from '@/components/assistant/CharterIntake'

type Cite = { sectionKey: string; sectionTitle: string; n: number; text: string; filename?: string }

export default function RightAssistantPanel({ projectId, fixes, citations, chat, charter }: { projectId: string; fixes: any[]; citations?: Cite[]; chat?: { role: string; content: string }[]; charter?: any }){
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
      <div style={{marginBottom:12}}>
        <div style={{fontWeight:600, marginBottom:6}}>Assistant</div>
        {(!charter || Object.values(charter||{}).every(v => !String(v||'').trim())) ? (
          <CharterIntake projectId={projectId} initial={charter} />
        ) : (
          <AssistantChat projectId={projectId} initial={chat} />
        )}
      </div>
      <div>
        <div style={{fontWeight:600, marginBottom:6}}>Citations</div>
        {cites.length ? (
          <div style={{fontSize:12, color:'#6b7280', border:'1px solid #1f2430', borderRadius:12, padding:10}}>
            {/* Quick jump nav */}
            <div style={{marginBottom:8}}>
              {Object.entries(grouped).map(([key, g]) => (
                <a key={key} href={`#sec-${key}`} style={{marginRight:8, textDecoration:'none'}} title={g.title}>{g.title} ({g.items.length})</a>
              ))}
            </div>
            {/* Grouped list */}
            {Object.entries(grouped).map(([key, g]) => (
              <div key={key} id={`cite-${key}`} style={{marginBottom:10, paddingBottom:8, borderBottom:'1px solid #1f2430'}}>
                <div style={{fontWeight:600, color:'#D1D5DB'}}><a href={`#sec-${key}`} style={{textDecoration:'none'}}>{g.title}</a></div>
                <ul style={{paddingLeft:16, marginTop:6}}>
                  {g.items.map((c, i) => (
                    <li key={i} style={{margin:'6px 0'}}>
                      <a href={`#sec-${c.sectionKey}`} title="Jump to section" style={{textDecoration:'none'}}>[{c.n}]</a>
                      {' '}{c.text}
                      {' '}{c.filename ? `(Source: ${c.filename})` : ''}
                    </li>
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
