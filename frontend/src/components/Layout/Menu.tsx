
"use client"

import type React from "react"
import { Search, User, ChevronDown, Menu, X, Shield, LogOut, Eye } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Logo from "../../components/Logo/Logo"
import NotificationDropdown from "./NotificationDropdown"
import { eraseCookie, getCookie } from "../../utils/cookieUltil"
import API_URL_BE from "../Link/LinkAPI"

interface HeaderProps {
  showMobileMenu: boolean
  setShowMobileMenu: React.Dispatch<React.SetStateAction<boolean>>
}

interface UserData {
  id: string
  fullName: string
  email: string
  avatar?: string
  role: string
}

const Header = ({ showMobileMenu, setShowMobileMenu }: HeaderProps) => {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Handle sign out
  const handleSignOut = () => {
    // Erase userId cookie
    eraseCookie('userId')
    // Remove items from localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('userId')
    // Navigate to login page
    navigate('/login')
  }

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = getCookie("userId")
        const role = localStorage.getItem("role") || "Admin"

        if (!userId) {
          // No userId, set userData to null to show "Login"
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

  // Get avatar initials
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

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between shadow-sm relative z-50">
      <div className="flex items-center">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="md:hidden mr-4 text-gray-600 hover:text-gray-800 transition-colors duration-200"
          aria-label="Toggle mobile menu"
        >
          <div className="relative w-6 h-6">
            <X
              size={24}
              className={`absolute inset-0 transition-all duration-300 ${
                showMobileMenu ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75"
              }`}
            />
            <Menu
              size={24}
              className={`absolute inset-0 transition-all duration-300 ${
                showMobileMenu ? "opacity-0 -rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
              }`}
            />
          </div>
        </button>
        <Logo />
      </div>

      <div className="flex items-center space-x-4">
        <nav className="hidden lg:flex space-x-6 mr-8">
          <a href="/home" className="text-blue-700 font-medium hover:text-blue-900 transition-colors duration-200">
            Home
          </a>
          <a href="/search" className="text-gray-500 hover:text-gray-800 transition-colors duration-200">
            Vehicle
          </a>
          <a href="/usermap" className="text-gray-500 hover:text-gray-800 transition-colors duration-200">
            Map
          </a>
          <a href="/help" className="text-gray-600 hover:text-gray-800 transition-colors duration-200">
            Help
          </a>

        </nav>

        {/* Notification Component */}
        {userData && <NotificationDropdown />}

        {/* User Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            className="flex items-center space-x-2 rounded-lg hover:bg-gray-100 py-2 px-3 transition-all duration-200 transform hover:scale-105"
            onClick={() => (userData ? setShowUserMenu(!showUserMenu) : navigate('/login'))}
            aria-label="Toggle user menu"
          >
            {/* Avatar */}
            <div className="relative">
              {userData?.avatar ? (
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
                  userData?.avatar ? "hidden" : ""
                }`}
              >
                {loading ? "..." : userData ? getAvatarInitials(userData) : "LI"}
              </div>
              {userData && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
              )}
            </div>

            {/* User fullName or Login */}
            <span className="text-sm text-gray-700 font-medium hidden sm:block max-w-24 truncate">
              {loading ? "Loading..." : userData?.fullName || userData?.role || "Login"}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform duration-200 ${showUserMenu ? "rotate-180" : "rotate-0"}`}
            />
          </button>

          {/* User Dropdown */}
          {showUserMenu && userData && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-medium text-gray-800">{loading ? "Loading..." : userData?.fullName || userData?.role || "Admin"}</p>
                <p className="text-sm text-gray-600">{loading ? "" : userData?.email || ""}</p>
              </div>

              <div className="py-1">
                <a href="/myprofile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <User size={16} className="mr-2" />
                  Your Profile
                </a>

                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors duration-200"
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
    </header>
  )
}

// MobileDropdownMenu component
const MobileDropdownMenu = ({ showMobileMenu, setShowMobileMenu }: HeaderProps) => {
  const navigate = useNavigate()

  // Handle sign out for mobile menu
  const handleSignOut = () => {
    // Erase userId cookie
    eraseCookie('userId')
    // Remove items from localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('userId')
    // Navigate to login page
    navigate('/login')
  }

  const menuItems = [
    { id: "home", fullName: "Home", icon: <Eye size={20} />, path: "/home", active: true },
    { id: "search", fullName: "Search Violations", icon: <Search size={20} />, path: "/search" },
    { id: "help", fullName: "Help", icon: <Shield size={20} />, path: "/help" },
    { id: "contact", fullName: "Contact", icon: <User size={20} />, path: "/contact" },
    { id: "logout", fullName: "Log Out", icon: <LogOut size={20} />, path: "/logout" },
  ]

  if (!showMobileMenu) {
    return null
  }

  return (
    <>
      {/* Overlay */}
      <div className="md:hidden fixed inset-0 bg-black bg-opacity-25 z-40" onClick={() => setShowMobileMenu(false)} />

      {/* Dropdown menu */}
      <div className="md:hidden absolute top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-xl z-50 mt-16 animate-slideDown">
        <nav className="py-2">
          <ul className="space-y-1">
            {menuItems.map((item, index) => (
              <li
                key={item.id}
                className="animate-slideInLeft"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: "both",
                }}
              >
                <button
                  onClick={() => {
                    setShowMobileMenu(false)
                    if (item.id === "logout") {
                      handleSignOut()
                    } else {
                      navigate(item.path)
                    }
                  }}
                  className={`w-full flex items-center py-3 px-6 transition-all duration-200 relative group
                    ${
                      item.active
                        ? "bg-blue-600 text-white shadow-lg"
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                >
                  <span
                    className={`transition-colors duration-200 ${
                      item.active ? "text-white" : "text-gray-400 group-hover:text-blue-600"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="ml-3 text-sm font-medium">{item.fullName}</span>
                  {item.active && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-blue-300 h-2 w-2 rounded-full animate-pulse"></div>
                  )}

                  {/* Hover effect */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 bg-blue-600 transition-all duration-200 ${
                      item.active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  ></div>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slideInLeft {
          from {
            transform: translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        
        .animate-slideInLeft {
          animation: slideInLeft 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

export { Header, MobileDropdownMenu }
