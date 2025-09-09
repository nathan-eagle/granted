'use client'
import { useEffect, useRef, useState } from 'react'

type Section = { key: string; title: string }

export default function OutlinePanel({ sections }: { sections: Section[] }){
  const [active, setActive] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const opts = { root: null, rootMargin: '0px', threshold: 0.3 }
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.getAttribute('id') || ''
          if (id.startsWith('sec-')) setActive(id.replace('sec-',''))
        }
      })
    }, opts)
    sections.forEach(s => {
      const el = document.getElementById(`sec-${s.key}`)
      if (el) observerRef.current?.observe(el)
    })
    return () => observerRef.current?.disconnect()
  }, [sections])

  function onKeyDown(e: React.KeyboardEvent){
    const idx = sections.findIndex(s => s.key === active)
    if (e.key === 'ArrowDown') {
      const next = sections[Math.min(sections.length-1, Math.max(0, idx+1))]
      if (next) document.getElementById(`sec-${next.key}`)?.scrollIntoView({ behavior:'smooth' })
    } else if (e.key === 'ArrowUp') {
      const prev = sections[Math.max(0, idx-1)]
      if (prev) document.getElementById(`sec-${prev.key}`)?.scrollIntoView({ behavior:'smooth' })
    } else if (e.key === 'Enter') {
      const key = active || sections[0]?.key
      if (key) document.getElementById(`edit-${key}`)?.focus()
    }
  }
  return (
    <div tabIndex={0} onKeyDown={onKeyDown} style={{outline:'none'}}>
      <ul>
        {sections.map(s => (
          <li key={s.key}>
            <a href={`#sec-${s.key}`} style={{textDecoration:'none', fontWeight: active===s.key ? 700 : 400}}>{s.title}</a>
          </li>
        ))}
      </ul>
      <div style={{fontSize:12, color:'#9CA3AF', marginTop:6}}>Tip: ↑/↓ to navigate, Enter to edit</div>
    </div>
  )
}
