import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { FileText, Folder, StickyNote, Search, Users, Handshake, Target, ListChecks, Globe, HelpCircle, Settings, LayoutGrid } from "lucide-react"

type NavItem = {
  href: string
  icon: LucideIcon
  label: string
  badge?: string
}

type NavGroup = {
  title: string | null
  items: NavItem[]
}

const groups: NavGroup[] = [
  {
    title: null,
    items: [
      { href: "/overview", icon: LayoutGrid, label: "Overview" },
      { href: "/files", icon: Folder, label: "Files" },
      { href: "/documents", icon: FileText, label: "Documents" },
      { href: "/notes", icon: StickyNote, label: "Notes" },
      { href: "/discover", icon: Search, label: "Discover", badge: "Beta" },
    ],
  },
  {
    title: "Records",
    items: [
      { href: "/funders", icon: Handshake, label: "Funders" },
      { href: "/people", icon: Users, label: "People" },
      { href: "/opportunities", icon: Target, label: "Opportunities" },
      { href: "/grants", icon: ListChecks, label: "Grants" },
      { href: "/programs", icon: Globe, label: "Programs" },
    ],
  },
  {
    title: "Organization",
    items: [
      { href: "/profile", icon: Users, label: "Profile" },
      { href: "/style-guide", icon: FileText, label: "Style Guide" },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="h-full w-[280px] shrink-0 border-r bg-white">
      <div className="p-4">
        <input placeholder="Search" className="w-full text-sm rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
      </div>

      <nav className="px-2 pb-24 overflow-y-auto h-[calc(100%-4rem)]">
        {groups.map((group, gi) => (
          <div key={gi} className="mb-6">
            {group.title && <div className="px-2 text-xs uppercase tracking-wide text-gray-500 mb-2">{group.title}</div>}
            <ul className="space-y-1">
              {group.items.map(it => (
                <li key={it.href}>
                  <Link href={it.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <it.icon size={18} className="text-gray-500" />
                    <span className="flex-1">{it.label}</span>
                    {it.badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700">{it.badge}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="absolute bottom-0 left-0 right-0 border-t bg-white p-3">
          <Link href="/help" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <HelpCircle size={18} className="text-gray-500" /> Help
          </Link>
          <Link href="/settings" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <Settings size={18} className="text-gray-500" /> Settings
          </Link>
          <div className="mt-3 text-xs text-gray-500 px-3">Free plan</div>
        </div>
      </nav>
    </aside>
  )
}
