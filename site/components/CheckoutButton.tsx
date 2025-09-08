"use client"

import { useState } from 'react'

export default function CheckoutButton({ plan = 'monthly', label = 'Start Writing' }: { plan?: 'monthly'|'yearly', label?: string }) {
  const [loading, setLoading] = useState(false)
  async function go() {
    setLoading(true)
    const url = plan === 'yearly'
      ? process.env.NEXT_PUBLIC_STRIPE_YEARLY_URL
      : process.env.NEXT_PUBLIC_STRIPE_MONTHLY_URL
    if (url) {
      window.location.href = url
    } else {
      console.warn('Stripe Checkout URL not configured')
      setLoading(false)
    }
  }
  return (
    <button onClick={go} disabled={loading} className="px-6 py-3 rounded-md bg-yellow-400 text-black font-semibold hover:bg-yellow-300 border border-yellow-500 shadow disabled:opacity-60">
      {loading ? 'Redirecting…' : label}
    </button>
  )
}
