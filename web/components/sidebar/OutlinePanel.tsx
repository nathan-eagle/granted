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

  return (
    <ul>
      {sections.map(s => (
        <li key={s.key}>
          <a href={`#sec-${s.key}`} style={{textDecoration:'none', fontWeight: active===s.key ? 700 : 400}}>{s.title}</a>
        </li>
      ))}
    </ul>
  )
}

