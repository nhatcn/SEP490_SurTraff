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
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl focus:ring-blue-500",
    secondary: "bg-gray-800 hover:bg-gray-900 text-white shadow-lg hover:shadow-xl focus:ring-gray-700",
    outline:
      "border border-blue-300 bg-white hover:bg-blue-50 text-blue-700 shadow-md hover:shadow-lg focus:ring-blue-500 hover:border-blue-300",
    ghost: "text-gray-600 hover:text-blue-800 hover:bg-blue-50 focus:ring-blue-500 hover:shadow-md",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl focus:ring-emerald-500", // Changed to green
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl focus:ring-red-500", // Changed to red
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizes[size]} ${variants[variant]} ${className} ${disabled ? "opacity-50 cursor-not-allowed transform-none" : ""}`}
    >
      <span className="absolute inset-0 bg-white/10 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
      <span className="relative z-10">{children}</span>
    </button>
  )
}
