"use client"

import type React from "react"

import { User, ChevronDown, Menu, X, Shield, LogOut, Eye, Search } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import Logo from "../../components/Logo/Logo"
import NotificationDropdown from "./NotificationDropdown"

interface HeaderProps {
  showMobileMenu: boolean
  setShowMobileMenu: React.Dispatch<React.SetStateAction<boolean>>
}

const Header = ({ showMobileMenu, setShowMobileMenu }: HeaderProps) => {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

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
          <a href="#" className="text-blue-700 font-medium hover:text-blue-900 transition-colors duration-200">
            Home
          </a>
          <a href="#" className="text-gray-500 hover:text-gray-800 transition-colors duration-200">
            Search Violations
          </a>
          <a href="#" className="text-gray-600 hover:text-gray-800 transition-colors duration-200">
            Help
          </a>
          <a href="#" className="text-gray-600 hover:text-gray-800 transition-colors duration-200">
            Contact
          </a>
        </nav>

        {/* Notification Component */}
        <NotificationDropdown />

        {/* User Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            className="flex items-center space-x-2 rounded-lg hover:bg-gray-100 py-2 px-3 transition-all duration-200 transform hover:scale-105"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="Toggle user menu"
          >
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm shadow-lg">
              CU
            </div>
            <span className="text-sm text-gray-700 font-medium hidden sm:block">Customer</span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform duration-200 ${showUserMenu ? "rotate-180" : "rotate-0"}`}
            />
          </button>

          <div
            className={`absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 transition-all duration-300 ease-out transform ${
              showUserMenu
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
            }`}
          >
            <div className="py-2">
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-semibold shadow-lg">
                    CU
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Customer</p>
                    <p className="text-xs text-gray-500">customer@example.com</p>
                  </div>
                </div>
              </div>

              <a
                href="#"
                className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 group"
              >
                <User
                  size={16}
                  className="mr-3 text-gray-400 group-hover:text-blue-600 transition-colors duration-200"
                />
                Your Profile
              </a>
              <a
                href="#"
                className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 group"
              >
                <Shield
                  size={16}
                  className="mr-3 text-gray-400 group-hover:text-blue-600 transition-colors duration-200"
                />
                Settings
              </a>

              <div className="border-t border-gray-100 my-1"></div>

              <a
                href="#"
                className="flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 group"
              >
                <LogOut
                  size={16}
                  className="mr-3 text-red-400 group-hover:text-red-600 transition-colors duration-200"
                />
                Sign out
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

// MobileDropdownMenu component
const MobileDropdownMenu = ({ showMobileMenu, setShowMobileMenu }: HeaderProps) => {
  const menuItems = [
    { id: "home", name: "Home", icon: <Eye size={20} />, path: "/home", active: true },
    { id: "search", name: "Search Violations", icon: <Search size={20} />, path: "/search" },
    { id: "help", name: "Help", icon: <Shield size={20} />, path: "/help" },
    { id: "contact", name: "Contact", icon: <User size={20} />, path: "/contact" },
    { id: "logout", name: "Log Out", icon: <LogOut size={20} />, path: "/logout" },
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
                    // Add navigation logic here if needed
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
                  <span className="ml-3 text-sm font-medium">{item.name}</span>
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
