'use client'
import { ButtonHTMLAttributes } from 'react'

export default function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', ...rest } = props
  return (
    <button
      {...rest}
      className={
        'px-4 py-2 rounded-md text-white shadow ' +
        'bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-95 focus:outline-none ' +
        'focus:ring-2 focus:ring-[rgba(124,58,237,0.45)] transition ' +
        className
      }
    />
  )
}

