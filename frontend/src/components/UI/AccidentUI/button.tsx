"use client"

import type React from "react"

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  variant?: "primary" | "secondary" | "outline" | "ghost" | "success" | "danger"
  size?: "sm" | "md" | "lg"
}

export const Button = ({
  children,
  onClick,
  className = "",
  disabled = false,
  variant = "primary",
  size = "md",
}: ButtonProps) => {
  const baseClasses =
    "font-medium transition-all duration-300 flex items-center justify-center rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-105 hover:-translate-y-0.5 active:scale-95 relative overflow-hidden group"

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  }

  const variants = {
    primary:
      "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl focus:ring-blue-500",
    secondary:
      "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-lg hover:shadow-xl focus:ring-gray-500",
    outline:
      "border border-gray-300 bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 text-gray-700 shadow-md hover:shadow-lg focus:ring-blue-500 hover:border-blue-300",
    ghost:
      "text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-100 hover:to-blue-100 focus:ring-gray-500 hover:shadow-md",
    success:
      "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl focus:ring-green-500",
    danger:
      "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl focus:ring-red-500",
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizes[size]} ${variants[variant]} ${className} ${
        disabled ? "opacity-50 cursor-not-allowed transform-none" : ""
      }`}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
      <span className="relative z-10">{children}</span>
    </button>
  )
}
