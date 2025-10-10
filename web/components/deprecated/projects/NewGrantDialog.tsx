"use client"
import * as Dialog from "@radix-ui/react-dialog"
import React from "react"
import { useRouter } from "next/navigation"

export default function NewGrantDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function create() {
    setLoading(true)
    const res = await fetch("/api/projects", { method: "POST", body: JSON.stringify({ name }), headers: { "Content-Type":"application/json" } })
    const json = await res.json()
    setLoading(false)
    if (json?.project?.id) {
      setOpen(false)
      setName("")
      router.push(`/agent/${json.project.id}`)
      router.refresh()
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm px-3 py-2 hover:opacity-90">+ New Grant</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg border w-[90vw] max-w-md p-6 shadow-card">
          <Dialog.Title className="text-lg font-semibold mb-2">Create a new grant</Dialog.Title>
          <div className="space-y-2">
            <label className="text-sm">Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="e.g., NSF SBIR Phase I" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Dialog.Close className="rounded-md border px-3 py-2 text-sm">Cancel</Dialog.Close>
            <button onClick={create} disabled={!name || loading} className="rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-3 py-2 text-sm disabled:opacity-60">{loading ? "Creating..." : "Create"}</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
