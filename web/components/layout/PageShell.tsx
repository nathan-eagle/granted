import Topbar from "./Topbar"
import Sidebar from "./Sidebar"

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  )
}
