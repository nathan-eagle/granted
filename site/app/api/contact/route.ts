import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const toEmail = process.env.CONTACT_TO_EMAIL || 'info@grantedai.com'
const fromEmail = process.env.CONTACT_FROM_EMAIL || 'contact@grantedai.com'

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json()
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not set; dropping contact message')
      return NextResponse.json({ ok: true })
    }
    const resend = new Resend(resendApiKey)
    await resend.emails.send({
      to: toEmail,
      from: fromEmail,
      subject: `New contact form submission`,
      reply_to: String(email),
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
