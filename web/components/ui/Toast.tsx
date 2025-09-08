'use client'
import { createContext, useCallback, useContext, useState } from 'react'

type Toast = { id: string; text: string }
const ToastCtx = createContext<{ show: (text: string) => void } | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }){
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((text: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(ts => [...ts, { id, text }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3000)
  }, [])
  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div style={{position:'fixed', right:16, bottom:16, display:'grid', gap:8, zIndex:2000}}>
        {toasts.map(t => (
          <div key={t.id} style={{background:'#111318', color:'#E5E7EB', border:'1px solid #1f2430', borderRadius:8, padding:'8px 12px', boxShadow:'0 6px 12px rgba(0,0,0,0.3)'}}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast(){
  const ctx = useContext(ToastCtx)
  if (!ctx) return { show: () => {} }
  return ctx
}

