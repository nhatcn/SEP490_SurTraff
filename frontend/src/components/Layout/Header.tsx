
"use client"

import { Search, Bell, User, ChevronDown, Clock } from "lucide-react"
import { useState, useEffect } from "react"
import { getCookie } from "../../utils/cookieUltil"
import { useNavigate } from "react-router-dom"
import API_URL_BE from "../Link/LinkAPI"

interface HeaderProps {
  title: string
}

interface UserData {
  id: string
  fullName: string
  email: string
  avatar?: string
  role: string
}

export default function Header({ title }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const navigate = useNavigate()

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = getCookie('userId')
        const role = localStorage.getItem("role") || "Admin"

        if (!userId) {
          // No cookie found, set userData to null to show "Login"
          setUserData(null)
          setLoading(false)
          return
        }

        const response = await fetch(API_URL_BE +`api/users/${userId}`)

        if (response.ok) {
          const user = await response.json()
          setUserData({
            ...user,
            role: role || user.role || "Admin",
          })
        } else {
          setUserData({
            id: userId,
            fullName: "User",
            email: "",
            role: role,
          })
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        const userId = localStorage.getItem("userId") || ""
        const role = localStorage.getItem("role") || "Admin"
        setUserData({
          id: userId,
          fullName: "User",
          email: "",
          role: role,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const getAvatarInitials = (user: UserData) => {
    if (user.fullName) {
      const words = user.fullName.split(" ").filter((word) => word.length > 0)
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
      }
      return user.fullName.substring(0, 2).toUpperCase()
    }
    return "AD"
  }

  const notifications = [
    {
      id: 1,
      title: "Camera #103 detected violation",
      message: "Speed violation - License: ABC-123",
      time: "2 minutes ago",
      type: "violation",
    },
    {
      id: 2,
      title: "System maintenance completed",
      message: "All cameras are now operational",
      time: "1 hour ago",
      type: "system",
    },
    {
      id: 3,
      title: "Storage space warning",
      message: "Server storage at 85% capacity",
      time: "3 hours ago",
      type: "warning",
    },
  ]

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Title */}
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
              <div className="flex items-center space-x-3 mt-1">
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>System Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-3">
            {/* Search Button */}
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors duration-200">
              <Search size={18} />
            </button>

            {/* Notifications */}
            {userData && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  <Bell size={18} />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">3</span>
                  </span>
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="font-medium text-gray-800">Notifications</h3>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 hover:bg-gray-50 border-l-4 ${
                            notification.type === "violation"
                              ? "border-red-500"
                              : notification.type === "warning"
                                ? "border-yellow-500"
                                : "border-blue-500"
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-800">{notification.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
                        </div>
                      ))}
                    </div>

                    <div className="px-4 py-3 border-t border-gray-100 text-center">
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Menu */}
            <div className="relative">
              {userData ? (
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 rounded-lg hover:bg-gray-100 py-2 px-3 transition-colors duration-200"
                >
                  {/* Avatar */}
                  <div className="relative">
                    {userData.avatar ? (
                      <img
                        src={userData.avatar || "/placeholder.svg"}
                        alt="User Avatar"
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                          target.nextElementSibling?.classList.remove("hidden")
                        }}
                      />
                    ) : null}
                    <div
                      className={`bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                        userData.avatar ? "hidden" : ""
                      }`}
                    >
                      {loading ? "..." : userData ? getAvatarInitials(userData) : "AD"}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                  </div>

                  {/* User Info */}
                  <div className="hidden sm:block text-left">
                    <span className="text-sm font-medium text-gray-700 block max-w-24 truncate">
                      {loading ? "Loading..." : userData?.fullName || userData?.role || "Admin"}
                    </span>
                  </div>

                  <ChevronDown size={16} className="text-gray-500" />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center space-x-2 rounded-lg hover:bg-gray-100 py-2 px-3 transition-colors duration-200"
                >
                  <div className="relative">
                    <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm">
                      {loading ? "..." : "LI"}
                    </div>
                  </div>
                  <div className="hidden sm:block text-left">
                    <span className="text-sm font-medium text-gray-700 block max-w-24 truncate">
                      {loading ? "Loading..." : "Login"}
                    </span>
                  </div>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
              )}

              {/* User Dropdown */}
              {showUserMenu && userData && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="font-medium text-gray-800">{userData?.fullName || "Admin"}</p>
                    <p className="text-sm text-gray-600">{userData?.email || ""}</p>
                  </div>

                  <div className="py-1">
                    <a href="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <User size={16} className="mr-2" />
                      Your Profile
                    </a>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={() => navigate('/login')}
                      className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
