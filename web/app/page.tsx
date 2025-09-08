import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function Home() {
  const session = await getServerSession(authOptions)
  
  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Welcome to Granted</h1>
      {session ? (
        <div>
          <p>Welcome back, {session.user?.email}!</p>
          <Link href="/projects" style={{ marginRight: '1rem' }}>
            Go to Projects
          </Link>
          <Link href="/demo" style={{ marginRight: '1rem' }}>
            Try Sample
          </Link>
          <Link href="/api/auth/signout">
            Sign Out
          </Link>
        </div>
      ) : (
        <div>
          <p>Please sign in to continue.</p>
          <Link href="/api/auth/signin">
            Sign In with Google
          </Link>
          <div style={{marginTop:12}}>
            <Link href="/demo">Try Sample (auto‑run)</Link>
          </div>
        </div>
      )}
    </div>
  )
}
