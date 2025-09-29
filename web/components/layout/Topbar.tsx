"use client"

export default function Topbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      <div className="mx-auto max-w-screen-2xl px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Replace with your SVG when ready */}
          <div className="h-8 w-8 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] grid place-items-center font-semibold">
            G
          </div>
          <div className="text-sm text-gray-600">Welcome, Nathan</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-700">Free plan • Full seat</span>
          <button className="rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm px-3 py-2 hover:opacity-90 transition">
            Upgrade to Starter
          </button>
        </div>
      </div>
    </header>
  )
}
