import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Granted";

export const metadata: Metadata = {
  title: appName,
  description: "Conversational grant drafting workspace powered by the OpenAI Agents SDK.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div className="app-shell">
          <header className="app-header">
            <h1 className="app-title">{appName}</h1>
            <p className="app-subtitle">
              Upload RFPs, chat through coverage, and export polished drafts without leaving this
              workspace.
            </p>
          </header>
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
