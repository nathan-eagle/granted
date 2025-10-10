"use client"
import React from "react"

type CountsBarProps = {
  words?: number
  chars?: number
}

export default function CountsBar({ words = 0, chars = 0 }: CountsBarProps) {
  return (
    <div className="text-xs text-gray-600">
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 mr-2">
        Words: {words.toLocaleString()}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
        Chars: {chars.toLocaleString()}
      </span>
    </div>
  )
}
