"use client"

import { Bell, AlertTriangle, Clock, Shield, X } from "lucide-react"
import { useEffect } from "react"

interface Notification {
  id: number
  userId: number | null
  vehicleId: number | null
  accidentId: number | null
  violationId: number | null
  message: string
  notificationType: string
  createdAt: string
  read: boolean
}

interface NewNotificationAlertProps {
  notification: Notification
  onClose: () => void
}

function timeAgo(dateString: string) {
  const now = new Date()
  const past = new Date(dateString)
  const diffMs = now.getTime() - past.getTime()
  const seconds = Math.floor(diffMs / 1000)

  if (seconds < 60) return `${seconds} seconds ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  return `${days} days ago`
}

const getNotificationIcon = (type: string, size = 16) => {
  switch (type) {
    case "violation":
      return <AlertTriangle size={size} className="text-red-600 flex-shrink-0" />
    case "accident":
      return <AlertTriangle size={size} className="text-orange-600 flex-shrink-0" />
    default:
      return <Bell size={size} className="text-gray-600 flex-shrink-0" />
  }
}

export default function NewNotificationAlert({ notification, onClose }: NewNotificationAlertProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 5000) // Auto-close after 5 seconds
    return () => clearTimeout(timer)
  }, [notification, onClose])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full relative transform scale-100 transition-all duration-300 ease-out">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          aria-label="Close notification"
        >
          <X size={24} />
        </button>
        <div className="flex items-center justify-center mb-4">
          {getNotificationIcon(notification.notificationType, 48)}
        </div>
        <h3 className="text-center text-2xl font-bold text-gray-900 mb-4">New announcement!</h3>
        <div className="text-center">
          <p className="text-lg font-medium text-gray-800 mb-2">{notification.message}</p>
          <p className="text-sm text-gray-600">{timeAgo(notification.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}
