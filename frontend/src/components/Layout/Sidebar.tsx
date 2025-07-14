"use client"

import {
  Camera,
  LayoutDashboard,
  Users,
  Settings,
  Bell,
  Map,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  User,
  Car,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Shield,
  ChevronDown,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Logo from "../Logo/Logo"

interface SidebarProps {
  defaultActiveItem?: string
}

export default function Sidebar({ defaultActiveItem = "dashboard" }: SidebarProps) {
  const [expanded, setExpanded] = useState(true)
  const [activeItem, setActiveItem] = useState(defaultActiveItem)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null)
  const navigate = useNavigate()

  const menuItems = [
    {
      id: "dashboard",
      name: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/dashboard",
      description: "Overview & Analytics",
    },
    {
      id: "profile",
      name: "My Profile",
      icon: <User size={20} />,
      path: "",
      description: "Personal Information",
    },
    {
      id: "cameras",
      name: "Cameras",
      icon: <Camera size={20} />,
      path: "/cameras",
      description: "Camera Management",
    },
    {
      id: "map",
      name: "Live Map",
      icon: <Map size={20} />,
      path: "/map",
      description: "Real-time Monitoring",
    },
    {
      id: "vehicles",
      name: "Vehicle Management",
      icon: <Car size={20} />,
      path: "",
      description: "Vehicle Registry",
    },
    {
      id: "violations",
      name: "Violation Management",
      icon: <AlertTriangle size={20} />,
      path: "",
      description: "Traffic Violations",
    },
    {
      id: "accidents",
      name: "Accident Management",
      icon: <Shield size={20} />,
      path: "",
      description: "Accident Reports",
    },
    {
      id: "statistics",
      name: "Statistics",
      icon: <BarChart3 size={20} />,
      path: "",
      description: "Data Analytics",
      hasSubmenu: true,
      submenu: [
        {
          id: "violation-stats",
          name: "Violation Statistics",
          icon: <TrendingUp size={16} />,
          path: "",
          description: "Violation Data Analysis",
        },
        {
          id: "accident-stats",
          name: "Accident Statistics",
          icon: <TrendingUp size={16} />,
          path: "",
          description: "Accident Data Analysis",
        },
      ],
    },
    {
      id: "users",
      name: "Users",
      icon: <Users size={20} />,
      path: "/userdashboard",
      description: "User Management",
    },
    {
      id: "alerts",
      name: "Alerts",
      icon: <Bell size={20} />,
      path: "/alerts",
      description: "System Notifications",
      badge: "3",
    },
    {
      id: "settings",
      name: "Settings",
      icon: <Settings size={20} />,
      path: "/settings",
      description: "System Configuration",
    },
  ]

  const handleItemClick = (itemId: string, path: string) => {
    const item = menuItems.find(item => item.id === itemId)
    
    if (item?.hasSubmenu) {
      setExpandedSubmenu(expandedSubmenu === itemId ? null : itemId)
    } else {
      setActiveItem(itemId)
      if (path) {
        navigate(path)
      }
    }
  }

  const handleSubmenuClick = (itemId: string, path: string) => {
    setActiveItem(itemId)
    if (path) {
      navigate(path)
    }
  }

  // Auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setExpanded(false)
        setExpandedSubmenu(null)
      }
    }

    window.addEventListener("resize", handleResize)
    handleResize()

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div
      className={`
      relative flex flex-col h-full transition-all duration-500 ease-in-out
      ${expanded ? "w-64" : "w-26"}
      bg-gradient-to-b from-slate-900 via-gray-900 to-slate-800
      border-r border-gray-700/30 shadow-2xl
    `}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Header Section */}
      <div className="relative p-4 border-b border-gray-700/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          {/* Logo Container */}
          <div
            className={`flex items-center transition-all duration-500 ${expanded ? "justify-start" : "justify-center w-full"}`}
          >
            <div className="relative i">
              <Logo expanded={expanded} height={expanded ? 42 : 42} />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
          </div>

          {/* Toggle Button */}
          {expanded && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all duration-300 hover:scale-110 group border border-gray-600/30"
            >
              <ChevronLeft size={16} className="group-hover:scale-110 transition-transform duration-300" />
            </button>
          )}
        </div>

        {/* System Status */}
        {expanded && (
          <div className="mt-4 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">System Online</span>
            </div>
            <p className="text-gray-400 text-xs mt-1">All cameras operational</p>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        <nav className="px-3">
          <ul className="space-y-2">
            {menuItems.map((item, index) => (
              <li key={item.id} className="relative">
                <button
                  onClick={() => handleItemClick(item.id, item.path)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`
                    group relative w-full flex items-center py-3 px-4 rounded-xl
                    transition-all duration-300 transform hover:scale-[1.02]
                    ${
                      activeItem === item.id || expandedSubmenu === item.id
                        ? "bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-lg shadow-blue-500/25"
                        : "text-gray-300 hover:bg-gradient-to-r hover:from-gray-800/50 hover:to-slate-700/50 hover:text-white"
                    }
                    ${expanded ? "justify-start" : "justify-center"}
                  `}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  {/* Icon Container */}
                  <div
                    className={`
                    relative flex items-center justify-center w-8 h-8 rounded-lg
                    ${activeItem === item.id || expandedSubmenu === item.id ? "bg-white/20 shadow-inner" : "group-hover:bg-white/10"}
                    transition-all duration-300
                  `}
                  >
                    <span
                      className={`
                      transition-all duration-300
                      ${activeItem === item.id || expandedSubmenu === item.id ? "text-white drop-shadow-sm" : "text-gray-400 group-hover:text-white"}
                    `}
                    >
                      {item.icon}
                    </span>
                  </div>

                  {/* Text Content - Only show when expanded */}
                  {expanded && (
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{item.name}</span>
                        <div className="flex items-center space-x-2">
                          {item.badge && (
                            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-medium animate-pulse">
                              {item.badge}
                            </span>
                          )}
                          {item.hasSubmenu && (
                            <ChevronDown 
                              size={14} 
                              className={`transition-transform duration-300 ${
                                expandedSubmenu === item.id ? "rotate-180" : ""
                              }`} 
                            />
                          )}
                        </div>
                      </div>
                      <p
                        className={`
                        text-xs truncate transition-all duration-300
                        ${activeItem === item.id || expandedSubmenu === item.id ? "text-blue-100" : "text-gray-500 group-hover:text-gray-400"}
                      `}
                      >
                        {item.description}
                      </p>
                    </div>
                  )}

                  {/* Badge for collapsed state */}
                  {!expanded && item.badge && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
                      {item.badge}
                    </span>
                  )}

                  {/* Active Indicator */}
                  {(activeItem === item.id || expandedSubmenu === item.id) && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-300 to-indigo-300 rounded-r-full shadow-lg" />
                  )}

                  {/* Hover Glow Effect */}
                  <div
                    className={`
                    absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/0 to-indigo-600/0 
                    transition-all duration-300 pointer-events-none
                    ${hoveredItem === item.id && activeItem !== item.id && expandedSubmenu !== item.id ? "from-blue-600/10 to-indigo-600/10" : ""}
                  `}
                  />
                </button>

                {/* Submenu */}
                {item.hasSubmenu && expanded && expandedSubmenu === item.id && (
                  <div className="ml-4 mt-2 space-y-1">
                    {item.submenu?.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleSubmenuClick(subItem.id, subItem.path)}
                        className={`
                          w-full flex items-center py-2 px-3 rounded-lg text-sm
                          transition-all duration-200 transform hover:scale-[1.01]
                          ${
                            activeItem === subItem.id
                              ? "bg-blue-600/50 text-white"
                              : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                          }
                        `}
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-md mr-3">
                          {subItem.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{subItem.name}</div>
                          <div className="text-xs text-gray-500">{subItem.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Tooltip for collapsed state */}
                {!expanded && hoveredItem === item.id && (
                  <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 z-50">
                    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl border border-gray-700 whitespace-nowrap">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.description}</div>
                      {item.hasSubmenu && (
                        <div className="mt-2 space-y-1">
                          {item.submenu?.map((subItem) => (
                            <div key={subItem.id} className="text-xs text-gray-500 pl-2">
                              • {subItem.name}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Arrow */}
                      <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2">
                        <div className="w-2 h-2 bg-gray-900 border-l border-t border-gray-700 transform rotate-45"></div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Footer Section */}
      <div className="p-4 border-t border-gray-700/30 backdrop-blur-sm">
        <button
          onClick={() => {
            /* Add logout logic */
          }}
          className={`
            group w-full flex items-center py-3 px-4 rounded-xl
            text-gray-400 hover:text-red-400 hover:bg-red-500/10
            transition-all duration-300 transform hover:scale-105
            border border-transparent hover:border-red-500/20
            ${expanded ? "justify-start" : "justify-center"}
          `}
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg group-hover:bg-red-500/20 transition-all duration-300">
            <LogOut size={20} className="group-hover:rotate-12 transition-transform duration-300" />
          </div>
          {expanded && (
            <div className="ml-3">
              <span className="text-sm font-medium">Sign Out</span>
              <p className="text-xs text-gray-500 group-hover:text-red-300">End session</p>
            </div>
          )}
        </button>
      </div>

      {/* Expand Button for collapsed state */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="absolute -right-3 top-20 w-6 h-6 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 border border-gray-600 shadow-lg hover:scale-110"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}