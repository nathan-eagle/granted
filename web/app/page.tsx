import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import TasksDrawer from '@/components/TasksDrawer'

export default async function Home() {
  const session = await getServerSession(authOptions)
  
  return (
    <div style={{ padding:'2rem' }}>
      <div style={{ display:'grid', gridTemplateColumns: session ? '1fr 320px' : '1fr', gap:24, alignItems:'start' }}>
        <main>
          <h1>Welcome to Granted</h1>
          {session ? (
            <>
              <p style={{ color:'#6b7280' }}>Jump back in or start something new.</p>
              <div style={{ display:'flex', gap:12, margin:'12px 0' }}>
                <Link href="/projects" style={{ padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, textDecoration:'none' }}>Start Autowriting</Link>
                <Link href="/demo" style={{ padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, textDecoration:'none' }}>Try Sample</Link>
                <Link href="/projects" style={{ padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, textDecoration:'none' }}>Your Projects</Link>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:12, marginTop:16 }}>
                <Tile title="Announcements" desc="What’s new in Granted" href="/blog" />
                <Tile title="Learn" desc="Tips for SBIR/STTR writing" href="/learn" />
                <Tile title="Org Profile" desc="Tell us about your org" href="/settings" />
                <Tile title="Files" desc="Manage uploaded documents" href="/projects" />
              </div>
            </>
          ) : (
            <div>
              <p>Please sign in to continue.</p>
              <Link href="/api/auth/signin">Sign In with Google</Link>
              <div style={{marginTop:12}}>
                <Link href="/demo">Try Sample (auto‑run)</Link>
              </div>
            </div>
          )}
        </main>
        {session ? <TasksDrawer /> : null}
      </div>
    </div>
  )
}

function Tile({ title, desc, href }: { title: string; desc: string; href: string }){
  return (
    <Link href={href} style={{ textDecoration:'none', border:'1px solid #e5e7eb', borderRadius:12, padding:12, color:'inherit' }}>
      <div style={{ fontWeight:700 }}>{title}</div>
      <div style={{ fontSize:12, color:'#6b7280' }}>{desc}</div>
    </Link>
  )
}
