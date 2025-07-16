"use client"

import { Bell, AlertTriangle, Clock, Shield } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import axios from "axios"

interface Notification {
  id: number
  user_id: number | null
  vehicle_id: number | null
  accident_id: number | null
  violation_id: number | null
  message: string
  notification_type: string
  created_at: string
  read: boolean
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

const NotificationDropdown = () => {
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)
  const userId = 7 // Default userId = 7

  // Fetch notifications from API
  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true)
      try {
        const res = await axios.get<Notification[]>(`http://localhost:8081/api/notifications/${userId}`)
        // Filter to only show unread notifications
        const unreadOnly = res.data.filter((notification) => !notification.read)
        setNotifications(unreadOnly)
      } catch (error) {
        console.error("Failed to fetch notifications", error)
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [userId])

  // Mark notification as read
  async function markAsRead(notificationId: number) {
    try {
      await axios.put(`http://localhost:8081/api/notifications/read/${notificationId}`)
      // Immediately remove the notification from state since we only show unread ones
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    } catch (error) {
      console.error("Failed to mark notification as read", error)
    }
  }

  // Mark all notifications as read
  async function markAllAsRead() {
    try {
      const notificationIds = notifications.map((n) => n.id)
      await Promise.all(notificationIds.map((id) => axios.put(`http://localhost:8081/api/notifications/read/${id}`)))
      // Clear all notifications since they're all read now
      setNotifications([])
      setShowNotifications(false)
    } catch (error) {
      console.error("Failed to mark all notifications as read", error)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "violation":
        return <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
      case "accident":
        return <AlertTriangle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
      case "maintenance":
        return <Clock size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
      case "security":
        return <Shield size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
      default:
        return <Bell size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
    }
  }

  // Get notification background color based on type
  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case "violation":
        return "bg-red-50 border-l-4 border-red-500 hover:bg-red-100"
      case "accident":
        return "bg-orange-50 border-l-4 border-orange-500 hover:bg-orange-100"
      case "maintenance":
        return "bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100"
      case "security":
        return "bg-green-50 border-l-4 border-green-500 hover:bg-green-100"
      default:
        return "bg-gray-50 border-l-4 border-gray-500 hover:bg-gray-100"
    }
  }

  return (
    <div className="relative" ref={notificationRef}>
      <button
        className="relative p-2 rounded-full hover:bg-gray-100 transition-all duration-200 transform hover:scale-105"
        onClick={() => setShowNotifications(!showNotifications)}
        aria-label="Toggle notifications"
      >
        <Bell size={20} className="text-gray-600" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
            {notifications.length > 99 ? "99+" : notifications.length}
          </span>
        )}
      </button>

      <div
        className={`absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 transition-all duration-300 ease-out transform ${
          showNotifications
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center">
              <Bell size={16} className="mr-2 text-blue-600" />
              Notifications
              {notifications.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {notifications.length}
                </span>
              )}
            </h3>
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-64 overflow-y-auto">
          {loading && (
            <div className="px-4 py-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 text-sm mt-2">Loading notifications...</p>
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Bell size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No new notifications</p>
            </div>
          )}

          {!loading &&
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 cursor-pointer transition-colors duration-200 ${getNotificationBgColor(notification.notification_type)}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  {getNotificationIcon(notification.notification_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 break-words">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{timeAgo(notification.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
            View all notifications
          </button>
        </div>
      </div>
    </div>
  )
}

// Use default export instead of named export
export default NotificationDropdown
