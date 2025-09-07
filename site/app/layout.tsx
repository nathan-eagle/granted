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
        <header className="border-b bg-black text-white">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <Image src="/images/imgi_2_granted-logo-stars.png" alt="Granted" width={118} height={28} />
            </a>
            <nav className="flex items-center gap-6 text-sm">
              <a href="/pricing" className="hover:opacity-80">Pricing</a>
              <a href="/tech" className="hover:opacity-80">Technology</a>
              <a href="/blog" className="hover:opacity-80">Blog</a>
              <a href="/faq" className="hover:opacity-80">FAQ</a>
              <a href="https://app.grantedai.com" className="ml-4 font-medium hover:opacity-80">Login</a>
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
