"use client"

import * as React from "react"
import { signOut } from "next-auth/react"

type SessionResponse = {
  user?: {
    name?: string | null
    email?: string | null
  } | null
} | null

export default function Topbar() {
  const [session, setSession] = React.useState<SessionResponse>(null)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    let mounted = true
    fetch("/api/auth/session")
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (mounted) setSession(data)
      })
      .catch(() => {
        if (mounted) setSession(null)
      })
    return () => {
      mounted = false
    }
  }, [])

  const displayName = session?.user?.name || session?.user?.email || "Guest"
  const initial = displayName ? displayName.charAt(0).toUpperCase() : "G"

  React.useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener("click", handleClick)
    } else {
      document.removeEventListener("click", handleClick)
    }
    return () => document.removeEventListener("click", handleClick)
  }, [menuOpen])

  const toggleMenu = () => setMenuOpen(prev => !prev)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-[hsl(var(--primary))] text-sm font-semibold text-[hsl(var(--primary-foreground))]">
            {initial}
          </div>
          <div className="text-sm text-gray-600">Welcome, {displayName}</div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">Free plan • Full seat</span>
          {session?.user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={toggleMenu}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Account
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                  <path d="M10.146 3.646a.5.5 0 0 1 .708.708l-4.5 4.5a.5.5 0 0 1-.708 0l-4.5-4.5a.5.5 0 1 1 .708-.708L6 7.293l4.146-4.147Z" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-md border bg-white shadow-lg">
                  <div className="px-4 py-3 text-xs text-gray-500">
                    Signed in as
                    <div className="truncate text-sm text-gray-800">{displayName}</div>
                  </div>
                  <button
                    onClick={() => {
                      closeMenu()
                      signOut({ callbackUrl: "/" })
                    }}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
              href="/api/auth/signin?callbackUrl=/overview"
            >
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
