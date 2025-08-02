import type React from "react"

interface CardProps {
  children: React.ReactNode
  className?: string
}

export const Card = ({ children, className = "" }: CardProps) => (
  <div
    className={`bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl hover:border-gray-300 transition-all duration-300 transform hover:scale-[1.01] ${className}`}
  >
    {children}
  </div>
)

export const CardHeader = ({ children, className = "" }: CardProps) => (
  <div className={`px-6 py-4 border-b border-gray-100 ${className}`}>{children}</div>
)

export const CardTitle = ({ children, className = "" }: CardProps) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h3>
)

export const CardContent = ({ children, className = "" }: CardProps) => (
  <div className={`p-6 ${className}`}>{children}</div>
)
