"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import {
  Bell,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { getCookie } from "../../utils/cookieUltil"
import { Header, MobileDropdownMenu } from "../../components/Layout/Menu"
import Footer from "../../components/Layout/Footer"
import API_URL_BE from "../../components/Link/LinkAPI"

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
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks} weeks ago`
  const months = Math.floor(days / 30)
  return `${months} months ago`
}

const getNotificationIcon = (type: string, size = 20) => {
  switch (type) {
    case "violation":
      return <AlertTriangle size={size} className="text-red-500" />
    case "accident":
      return <AlertTriangle size={size} className="text-orange-500" />
    default:
      return <Bell size={size} className="text-slate-500" />
  }
}

const getNotificationStyle = (type: string, read: boolean) => {
  const opacity = read ? "opacity-70" : "opacity-100"
  const baseClasses = `transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${opacity}`

  switch (type) {
    case "violation":
      return `${baseClasses} bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-400 hover:from-red-100 hover:to-rose-100`
    case "accident":
      return `${baseClasses} bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-400 hover:from-orange-100 hover:to-amber-100`
    default:
      return `${baseClasses} bg-gradient-to-r from-slate-50 to-gray-50 border-l-4 border-slate-400 hover:from-slate-100 hover:to-gray-100`
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case "violation":
      return "Violation"
    case "accident":
      return "Accident"
    default:
      return "Notification"
  }
}

export default function NotificationsPage() {
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const fetchNotifications = async () => {
    setLoading(true)
    setError(null)
    try {
      const userId = getCookie("userId")
      if (!userId) {
        throw new Error("User ID not found in cookie. Please log in.")
      }
      const res = await axios.get<Notification[]>(`${API_URL_BE}api/notifications/${userId}`)
      const sortedNotifications = res.data.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      setNotifications(sortedNotifications)
    } catch (err) {
      console.error("Failed to fetch notifications", err)
      setError("Failed to load notifications. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const markAsRead = async (notificationId: number) => {
    try {
      await axios.put(API_URL_BE +`api/notifications/read/${notificationId}`)
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
    } catch (err) {
      console.error("Failed to mark notification as read", err)
    }
  }

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch = notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === "all" || notification.notificationType === filterType
    return matchesSearch && matchesFilter
  })

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentNotifications = filteredNotifications.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
      <MobileDropdownMenu showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
            <Bell size={32} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
            Notification
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Track all important notifications about your monitoring system
          </p>
          {unreadCount > 0 && (
            <div className="inline-flex items-center mt-4 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
              {unreadCount} unread notifications
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-10 pr-8 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[180px]"
              >
                <option value="all">All Types</option>
                <option value="violation">Violation</option>
                <option value="accident">Accident</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent absolute top-0"></div>
              </div>
              <p className="text-slate-600 text-lg mt-6 font-medium">Loading notifications...</p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle size={40} className="text-red-500" />
              </div>
              <p className="text-red-600 text-lg font-medium text-center">{error}</p>
            </div>
          )}
          {!loading && !error && filteredNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <Bell size={48} className="text-slate-400" />
              </div>
              <p className="text-slate-500 text-xl font-medium mb-2">
                {searchTerm || filterType !== "all" ? "No notifications found" : "No notifications yet"}
              </p>
              <p className="text-slate-400 text-center max-w-md">
                {searchTerm || filterType !== "all"
                  ? "Try changing your search keyword or filters"
                  : "New notifications will appear here as they are sent"}
              </p>
            </div>
          )}
          {!loading && !error && currentNotifications.length > 0 && (
            <div className="space-y-3">
              {currentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative p-6 rounded-2xl shadow-sm ${getNotificationStyle(notification.notificationType, notification.read)} cursor-pointer group`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 p-3 bg-white rounded-xl shadow-sm">
                      {getNotificationIcon(notification.notificationType, 24)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/80 text-slate-700 shadow-sm">
                          {getTypeLabel(notification.notificationType)}
                        </span>
                        <span className="text-sm text-slate-500 font-medium">{timeAgo(notification.createdAt)}</span>
                      </div>
                      <p
                        className={`text-base leading-relaxed ${
                          notification.read ? "text-slate-600" : "text-slate-800 font-medium"
                        }`}
                      >
                        {notification.message}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-center space-y-2">
                      {!notification.read && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg animate-pulse"></div>
                      )}
                      {notification.read ? (
                        <CheckCircle size={20} className="text-emerald-500" />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/50 transition-all duration-200 opacity-0 group-hover:opacity-100"
                          aria-label="Mark as read"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && filteredNotifications.length > itemsPerPage && (
          <div className="mt-8 flex items-center justify-between bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="text-sm text-slate-600">
              Showing {startIndex + 1} - {Math.min(endIndex, filteredNotifications.length)} of{" "}
              {filteredNotifications.length} notifications
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <ChevronLeft size={16} className="mr-1" />
                Previous
              </button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  const showPage =
                    page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)
                  if (!showPage) {
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-2 text-slate-400">
                          ...
                        </span>
                      )
                    }
                    return null
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        page === currentPage
                          ? "bg-blue-500 text-white shadow-md"
                          : "text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Next
                <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Statistics */}
        {!loading && !error && notifications.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Notification Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-slate-800">{notifications.length}</div>
                <div className="text-sm text-slate-600">Total</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
                <div className="text-sm text-slate-600">Unread</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <div className="text-2xl font-bold text-red-600">
                  {notifications.filter((n) => n.notificationType === "violation").length}
                </div>
                <div className="text-sm text-slate-600">Violations</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-xl">
                <div className="text-2xl font-bold text-emerald-600">
                  {notifications.filter((n) => n.notificationType === "accident").length}
                </div>
                <div className="text-sm text-slate-600">Accident</div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
