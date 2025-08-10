import type { ReactNode } from "react"

interface BadgeProps {
  children: ReactNode
  className?: string
}

export const Badge = ({ children, className = "" }: BadgeProps) => (
  <span
    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 ${className}`}
  >
    {children}
  </span>
)
