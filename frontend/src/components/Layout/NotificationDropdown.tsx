"use client"

import { Bell, AlertTriangle, Clock, Shield } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import axios from "axios"
import NewNotificationAlert from "./new-notification-alert"

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
  const [newToast, setNewToast] = useState<Notification | null>(null)
  const [shownToastIds, setShownToastIds] = useState<Set<number>>(new Set())
  const notificationRef = useRef<HTMLDivElement>(null)
  const userId = 9 // fake for testing
  const originalTitle = useRef(document.title)
  const [titleMarqueeIntervalId, setTitleMarqueeIntervalId] = useState<NodeJS.Timeout | null>(null)
  const titleMarqueeBaseText = useRef("🔔 You have new Violation/Accident")
  const currentMarqueeTitle = useRef("")

  const stopTitleMarquee = () => {
    if (titleMarqueeIntervalId) {
      clearInterval(titleMarqueeIntervalId)
      setTitleMarqueeIntervalId(null)
    }
    document.title = originalTitle.current
  }

  const startTitleMarquee = () => {
    if (!titleMarqueeIntervalId) {
      currentMarqueeTitle.current = titleMarqueeBaseText.current
      const interval = setInterval(() => {
        currentMarqueeTitle.current = currentMarqueeTitle.current.substring(1) + currentMarqueeTitle.current.charAt(0)
        document.title = currentMarqueeTitle.current
      }, 300)
      setTitleMarqueeIntervalId(interval)
    }
  }

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await axios.get<Notification[]>(`http://localhost:8081/api/notifications/${userId}`)
      const currentUnread = res.data.filter((n) => !n.read)

      // Tìm thông báo mới chưa hiển thị toast
      const newUnshown = currentUnread.filter((n) => !shownToastIds.has(n.id))

      // Lấy thông báo mới nhất trong danh sách chưa hiển thị
      const newestNotification = newUnshown.reduce(
        (latest, n) => {
          return !latest || new Date(n.createdAt) > new Date(latest.createdAt) ? n : latest
        },
        null as Notification | null,
      )

      if (currentUnread.length > 0) {
        if (document.hidden) {
          startTitleMarquee()
        } else {
          stopTitleMarquee()
          if (newestNotification) {
            setNewToast(newestNotification)
            setShownToastIds((prev) => new Set(prev).add(newestNotification.id))
          }
        }
      } else {
        stopTitleMarquee()
      }
      setNotifications(currentUnread)
    } catch (error) {
      console.error("Failed to fetch notifications", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 140000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        stopTitleMarquee()
      } else {
        if (notifications.length > 0) {
          startTitleMarquee()
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [notifications])

  useEffect(() => {
    return () => {
      stopTitleMarquee()
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const markAsRead = async (notificationId: number) => {
    try {
      await axios.put(`http://localhost:8081/api/notifications/read/${notificationId}`)
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    } catch (error) {
      console.error("Failed to mark notification as read", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const notificationIds = notifications.map((n) => n.id)
      await Promise.all(notificationIds.map((id) => axios.put(`http://localhost:8081/api/notifications/read/${id}`)))
      setNotifications([])
      setShowNotifications(false)
      stopTitleMarquee()
    } catch (error) {
      console.error("Failed to mark all notifications as read", error)
    }
  }

  const getNotificationIcon = (type: string, size = 16) => {
    switch (type) {
      case "violation":
        return <AlertTriangle size={size} className="text-red-500 mt-0.5 flex-shrink-0" />
      case "accident":
        return <AlertTriangle size={size} className="text-orange-500 mt-0.5 flex-shrink-0" />
      case "maintenance":
        return <Clock size={size} className="text-blue-500 mt-0.5 flex-shrink-0" />
      case "security":
        return <Shield size={size} className="text-green-500 mt-0.5 flex-shrink-0" />
      default:
        return <Bell size={size} className="text-gray-500 mt-0.5 flex-shrink-0" />
    }
  }

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
    <>
      {newToast && <NewNotificationAlert notification={newToast} onClose={() => setNewToast(null)} />}
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
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center overflow-hidden flex-1 min-w-0">
                <Bell size={16} className="mr-2 text-blue-600 flex-shrink-0" />
                <span className="whitespace-nowrap">
                  {"Notifications ("}
                  {notifications.length}
                  {")"}
                </span>
              </h3>
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0 ml-2"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>
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
                  className={`px-4 py-3 cursor-pointer transition-colors duration-200 ${getNotificationBgColor(
                    notification.notificationType,
                  )}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.notificationType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 break-words">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{timeAgo(notification.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
              View all notifications
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default NotificationDropdown
