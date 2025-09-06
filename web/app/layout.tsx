import './globals.css'
import { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

export const metadata = {
  title: 'Granted',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="en">
      <body>
        <header style={{display:'flex',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid #eee'}}>
          <div style={{fontWeight:600}}>Granted</div>
          <nav style={{display:'flex',gap:12}}>
            <Link href="/projects">Projects</Link>
            {session ? <a href="/api/auth/signout">Sign out</a> : <a href="/api/auth/signin?callbackUrl=/projects">Sign in</a>}
          </nav>
        </header>
        <main style={{maxWidth:960, margin:'24px auto', padding:'0 16px'}}>
          {children}
        </main>
      </body>
    </html>
  )
}
