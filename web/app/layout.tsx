import "./globals.css"
import { Inter } from "next/font/google"
import type { Metadata } from "next"
import AppToaster from "../components/ui/Toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Granted",
  description: "Grant writing workspace",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <AppToaster />
      </body>
    </html>
  )
}
