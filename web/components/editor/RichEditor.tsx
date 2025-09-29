"use client"
import React from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"

export default function RichEditor({
  content,
  onUpdate,
}: {
  content?: string
  onUpdate?: (html: string) => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bulletList: { keepMarks: true }, orderedList: { keepMarks: true } }),
      Link.configure({ openOnClick: true }),
    ],
    content: content || "<p></p>",
    onUpdate({ editor }) {
      onUpdate?.(editor.getHTML())
    },
  })

  if (!editor) return null

  return (
    <div className="border rounded-md">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={"text-sm px-2 py-1 rounded " + (editor.isActive("bold") ? "bg-gray-200" : "hover:bg-gray-100")}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={"text-sm px-2 py-1 rounded " + (editor.isActive("italic") ? "bg-gray-200" : "hover:bg-gray-100")}
        >
          I
        </button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className="text-sm px-2 py-1 rounded hover:bg-gray-100">
          • List
        </button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className="text-sm px-2 py-1 rounded hover:bg-gray-100">
          1. List
        </button>
        <button onClick={() => editor.chain().focus().undo().run()} className="text-sm px-2 py-1 rounded hover:bg-gray-100">
          ↩︎ Undo
        </button>
        <button onClick={() => editor.chain().focus().redo().run()} className="text-sm px-2 py-1 rounded hover:bg-gray-100">
          ↪︎ Redo
        </button>
        <button
          onClick={() => {
            const url = prompt("Enter URL")
            if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
          }}
          className="text-sm px-2 py-1 rounded hover:bg-gray-100"
        >
          Link
        </button>
      </div>
      <div className="p-3">
        <EditorContent editor={editor} className="prose max-w-none [&_.ProseMirror]:min-h-[140px]" />
      </div>
    </div>
  )
}
