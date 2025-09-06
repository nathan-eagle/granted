"use client"

import { useState } from 'react'

export default function ContactForm() {
  const [pending, setPending] = useState(false)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)
    setPending(true)
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Request failed')
      form.reset()
      setOk(true)
    } catch (e: any) {
      setErr('Could not send your message. Please try again later.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="grid gap-4 max-w-xl" onSubmit={onSubmit}>
      <input className="border rounded-md px-3 py-2" type="text" name="name" placeholder="Your name" required />
      <input className="border rounded-md px-3 py-2" type="email" name="email" placeholder="Your email" required />
      <textarea className="border rounded-md px-3 py-2" name="message" placeholder="How can we help?" rows={6} required />
      <button className="px-4 py-2 rounded-md bg-sky-500 text-white w-fit disabled:opacity-50" type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send'}
      </button>
      {ok && <div className="text-sm text-green-600">Thanks! We’ll get back to you shortly.</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}
    </form>
  )
}

