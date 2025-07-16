import type React from "react"

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export const Badge = ({ children, className = "" }: BadgeProps) => (
  <span
    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 hover:scale-110 ${className}`}
  >
    {children}
  </span>
)
