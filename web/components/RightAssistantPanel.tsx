import TopFixes from '@/components/TopFixes'

export default function RightAssistantPanel({ projectId, fixes }: { projectId: string; fixes: any[] }){
  return (
    <aside style={{position:'sticky', top:16}}>
      <div style={{fontWeight:700, marginBottom:8}}>Assistant</div>
      {fixes?.length ? (
        <div>
          <div style={{fontWeight:600, marginBottom:6}}>Top Fixes</div>
          <TopFixes projectId={projectId} fixes={fixes} />
        </div>
      ) : (
        <div style={{fontSize:14, color:'#6b7280'}}>
          No fixes yet. Try “Run Mock Review” after generating a draft to see prioritized suggestions.
        </div>
      )}
    </aside>
  )
}

