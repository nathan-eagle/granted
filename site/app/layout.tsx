import './globals.css'
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { Roboto, Bellota } from 'next/font/google'
import Script from 'next/script'
import Image from 'next/image'

const roboto = Roboto({ subsets: ['latin'], weight: ['300','400','500','700','900'], variable: '--font-roboto' })
const bellota = Bellota({ subsets: ['latin'], weight: ['300'], variable: '--font-bellota' })

export const metadata: Metadata = {
  title: 'Granted AI - Get Funded Faster.',
  description: 'Granted Gives You More Time for the Real Work with 10x Grant Writing',
  metadataBase: new URL('https://grantedai.com'),
  openGraph: {
    title: 'Granted AI - Get Funded Faster.',
    description: 'Granted Gives You More Time for the Real Work with 10x Grant Writing',
    url: '/',
    type: 'website',
    siteName: 'Granted: AI Proposal Writing',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Granted AI - Get Funded Faster.',
    description: 'Granted Gives You More Time for the Real Work with 10x Grant Writing',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${roboto.variable} ${bellota.variable}`}>
      <head>
        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-KQ6QHXD');`}
        </Script>
        {/* GA4 */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-RGQQTXGY1K" />
        <Script id="ga4" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);} gtag('js', new Date());
          gtag('config', 'G-RGQQTXGY1K');`}
        </Script>
        {/* Google Ads */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=AW-1025794968" />
        <Script id="google-ads" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);} gtag('js', new Date());
          gtag('config', 'AW-1025794968');`}
        </Script>
      </head>
      <body className="min-h-dvh flex flex-col">
        <header className="border-b">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <Image src="/images/granted-favicon.jpg" alt="Granted" width={28} height={28} className="rounded-sm" />
              <span className="font-bold tracking-tight">Granted</span>
            </a>
            <nav className="flex gap-6 text-sm">
              <a href="/features">Features</a>
              <a href="/pricing">Pricing</a>
              <a href="/blog">Blog</a>
              <a href="/faq">FAQ</a>
              <a href="/tech">Tech</a>
              <a href="/contact">Contact</a>
              <a href="https://app.grantedai.com" className="font-medium">Sign in</a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-500">© {new Date().getFullYear()} Granted AI</div>
        </footer>
        {/* GTM noscript */}
        <noscript>
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KQ6QHXD" height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} />
        </noscript>
      </body>
    </html>
  )
}
