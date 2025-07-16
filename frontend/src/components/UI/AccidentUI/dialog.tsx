"use client"

import type React from "react"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300">
        {children}
      </div>
    </div>
  )
}

export const DialogContent = ({ children, className = "" }: DialogContentProps) => (
  <div className={`p-6 ${className}`}>{children}</div>
)

export const DialogHeader = ({ children }: { children: React.ReactNode }) => <div className="mb-4">{children}</div>

export const DialogTitle = ({ children, className = "" }: DialogContentProps) => (
  <h2 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h2>
)

export const DialogDescription = ({ children, className = "" }: DialogContentProps) => (
  <p className={`text-sm text-gray-600 ${className}`}>{children}</p>
)

export const DialogFooter = ({ children, className = "" }: DialogContentProps) => (
  <div className={`flex justify-end space-x-3 mt-6 ${className}`}>{children}</div>
)
