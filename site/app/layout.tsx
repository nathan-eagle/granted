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
      <body className="min-h-dvh flex flex-col font-roboto">
        <header className="border-b bg-black text-white">
          <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3">
            <a href="/" className="flex items-center">
              <Image src="/images/imgi_2_granted-logo-stars.png" alt="Granted" width={118} height={28} />
            </a>
            <nav className="hidden md:flex items-center justify-center gap-8 text-sm font-medium tracking-[0.08em]">
              <a href="/pricing" className="transition-colors hover:underline">Pricing</a>
              <a href="/tech" className="transition-colors hover:underline">Technology</a>
              <a href="/blog" className="transition-colors hover:underline">Blog</a>
              <a href="/faq" className="transition-colors hover:underline">FAQ</a>
            </nav>
            <a href="https://app.grantedai.com" className="justify-self-end text-sm font-semibold text-white/80 transition hover:text-white hover:underline">
              Login
            </a>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="bg-black text-white">
          <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-12">
            <div className="grid gap-10 md:grid-cols-3 items-start">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Image src="/images/imgi_2_granted-logo-stars.png" alt="Granted" width={160} height={40} />
                </div>
                <p className="text-gray-300 text-sm max-w-xs">
                  Granted is making fundraising less tedious, more accessible, and more successful for everyone.
                </p>
                <div className="mt-6 text-sm text-gray-300">Join Us</div>
                <div className="mt-3 flex items-center gap-4">
                  <a aria-label="Facebook" href="#" className="hover:opacity-80">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.2V12h2.2V9.8c0-2.2 1.3-3.4 3.3-3.4.9 0 1.8.2 1.8.2v2h-1c-1 0-1.3.6-1.3 1.2V12h2.3l-.4 2.9h-1.9v7A10 10 0 0 0 22 12"/></svg>
                  </a>
                  <a aria-label="Twitter" href="#" className="hover:opacity-80">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.26 4.26 0 0 0 1.87-2.35 8.53 8.53 0 0 1-2.7 1.04 4.25 4.25 0 0 0-7.24 3.87A12.07 12.07 0 0 1 3.15 4.6a4.24 4.24 0 0 0 1.31 5.67 4.2 4.2 0 0 1-1.93-.54v.05c0 2.06 1.47 3.78 3.42 4.17-.36.1-.75.15-1.14.15-.28 0-.55-.03-.82-.08.55 1.73 2.16 2.99 4.07 3.03A8.52 8.52 0 0 1 2 19.54a12.02 12.02 0 0 0 6.52 1.91c7.83 0 12.11-6.48 12.11-12.1v-.55c.83-.6 1.55-1.35 2.13-2.21z"/></svg>
                  </a>
                  <a aria-label="LinkedIn" href="#" className="hover:opacity-80">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 8.67H4.12V20h2.82V8.67zM5.53 7.34a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28zM20 20h-2.82v-5.63c0-1.34-.03-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95V20H10.4V8.67h2.7v1.55h.04c.38-.72 1.32-1.48 2.72-1.48 2.9 0 3.44 1.9 3.44 4.36V20z"/></svg>
                  </a>
                </div>
              </div>
              <div>
                <ul className="space-y-3 text-sm">
                  <li><a className="hover:opacity-80" href="/pricing">Pricing</a></li>
                  <li><a className="hover:opacity-80" href="/features">Features</a></li>
                  <li><a className="hover:opacity-80" href="/tech">Technology</a></li>
                  <li><a className="hover:opacity-80" href="/faq">FAQ</a></li>
                  <li><a className="hover:opacity-80" href="/contact">Contact</a></li>
                </ul>
              </div>
              <div></div>
            </div>
            <hr className="my-8 border-gray-700" />
            <div className="flex items-center justify-between text-xs text-gray-300">
              <div>© {new Date().getFullYear()} Granted AI</div>
              <div className="flex items-center gap-8">
                <a href="#" className="hover:opacity-80">Privacy</a>
                <a href="#" className="hover:opacity-80">Terms</a>
                <span>@GrantedAI</span>
              </div>
            </div>
          </div>
        </footer>
        {/* GTM noscript */}
        <noscript>
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KQ6QHXD" height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} />
        </noscript>
      </body>
    </html>
  )
}
