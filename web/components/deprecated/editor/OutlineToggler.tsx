"use client"
import React from "react"

export default function OutlineToggler() {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<{text:string; id:string}[]>([])
  React.useEffect(()=>{
    const nodes = Array.from(document.querySelectorAll("h1, h2, h3")) as HTMLElement[]
    setItems(nodes.map((n,i)=>({ text: n.textContent || "", id: n.id || `h-${i}` })))
    nodes.forEach((n,i)=>{ if(!n.id) n.id = `h-${i}` })
  },[])
  if (!items.length) return null
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Outline</h3>
        <button onClick={()=>setOpen(o=>!o)} className="text-sm underline">{open ? "Hide" : "Show"}</button>
      </div>
      {open && (
        <ul className="text-sm mt-2 space-y-1">
          {items.map(it => (
            <li key={it.id}><a href={`#${it.id}`} className="underline">{it.text}</a></li>
          ))}
        </ul>
      )}
    </div>
  )
}
