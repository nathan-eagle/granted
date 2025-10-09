import Link from "next/link"
import { LayoutGrid } from "lucide-react"

const navItems = [
  {
    href: "/overview",
    icon: LayoutGrid,
    label: "Workspace",
  },
]

export default function Sidebar() {
  return (
    <aside className="h-full w-[240px] shrink-0 border-r bg-white">
      <div className="p-4 text-xs text-gray-500">Granted Workspace</div>
      <nav className="px-2 pb-6 overflow-y-auto h-[calc(100%-3.5rem)]">
        <ul className="space-y-1">
          {navItems.map(item => (
            <li key={item.href}>
              <Link href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <item.icon size={18} className="text-gray-500" />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
