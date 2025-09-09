'use client'
import Link from 'next/link'

export default function TasksDrawer(){
  const steps = [
    { label: 'Create a project', href: '/projects' },
    { label: 'Upload your docs', href: '/projects' },
    { label: 'Run Autopilot', href: '/projects' },
    { label: 'Export DOCX', href: '/projects' },
  ]
  return (
    <aside style={{ position:'sticky', top:20, border:'1px solid #e5e7eb', borderRadius:12, padding:12 }}>
      <div style={{ fontWeight:700, marginBottom:6 }}>Tasks</div>
      <ol style={{ paddingLeft:16 }}>
        {steps.map((s,i)=>(
          <li key={i} style={{ margin:'6px 0' }}>
            <Link href={s.href} style={{ textDecoration:'none' }}>{s.label}</Link>
          </li>
        ))}
      </ol>
    </aside>
  )
}

