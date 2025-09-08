import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''
const priceMonthly = process.env.STRIPE_PRICE_MONTHLY || ''
const priceYearly = process.env.STRIPE_PRICE_YEARLY || ''

export async function POST(req: Request) {
  try {
    if (!stripeSecretKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })
    const body = await req.json().catch(() => ({})) as any
    const plan = String(body?.plan || 'monthly')
    const price = plan === 'yearly' ? priceYearly : priceMonthly
    if (!price) return NextResponse.json({ error: 'Missing price id' }, { status: 400 })

    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://app.grantedai.com'
    const site = process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://grantedai.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${site}/pricing?cancelled=1`,
      // If your Stripe Price has a trial configured, it will apply automatically.
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

