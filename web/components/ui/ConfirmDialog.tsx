"use client"
import * as Dialog from "@radix-ui/react-dialog"
import { ReactNode } from "react"

export default function ConfirmDialog({
  open, onOpenChange, title="Are you sure?", description="This action cannot be undone.",
  confirmText="Confirm", cancelText="Cancel", onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean)=>void
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: ()=>void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg border w-[90vw] max-w-md p-6 shadow-card">
          <Dialog.Title className="text-lg font-semibold mb-2">{title}</Dialog.Title>
          <Dialog.Description className="text-sm text-gray-600 mb-4">{description}</Dialog.Description>
          <div className="flex justify-end gap-3">
            <button onClick={()=>onOpenChange(false)} className="rounded-md border px-3 py-2 text-sm">{cancelText}</button>
            <button onClick={()=>{onConfirm(); onOpenChange(false)}} className="rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-3 py-2 text-sm">{
              confirmText
            }</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
