"use client"

import type React from "react"

import {
  Search,
  Car,
  Calendar,
  Clock,
  MapPin,
  Shield,
  Eye,
  BarChart3,
  Camera,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Header, MobileDropdownMenu } from "../../components/Layout/Menu"
import Footer from "../../components/Layout/Footer"

interface Violation {
  id: number
  plateNumber: string
  violationType: string
  location: string
  time: string
  fine: string
  status: string
  image: string
}

interface StatCard {
  title: string
  value: string
  change: string
  icon: React.ReactNode
  color: string
}

const mockViolations: Violation[] = [
  {
    id: 1,
    plateNumber: "30A-12345",
    violationType: "Red Light Violation",
    location: "Le Loi - Nguyen Hue Intersection",
    time: "2024-06-15 14:30:25",
    fine: "$45",
    status: "Pending",
    image: "/api/placeholder/300/200",
  },
  {
    id: 2,
    plateNumber: "30A-12345",
    violationType: "Speeding",
    location: "Vo Van Kiet Street",
    time: "2024-06-10 09:15:42",
    fine: "$35",
    status: "Processed",
    image: "/api/placeholder/300/200",
  },
  {
    id: 3,
    plateNumber: "51B-67890",
    violationType: "Illegal Parking",
    location: "Nguyen Hue Walking Street",
    time: "2024-06-08 16:45:18",
    fine: "$25",
    status: "Pending",
    image: "/api/placeholder/300/200",
  },
]

const statsData: StatCard[] = [
  {
    title: "Active Cameras",
    value: "1,247",
    change: "+12%",
    icon: <Camera className="w-6 h-6" />,
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Violations Today",
    value: "89",
    change: "-8%",
    icon: <AlertTriangle className="w-6 h-6" />,
    color: "from-red-500 to-pink-500",
  },
  {
    title: "Processed Cases",
    value: "2,341",
    change: "+15%",
    icon: <CheckCircle className="w-6 h-6" />,
    color: "from-green-500 to-emerald-500",
  },
  {
    title: "System Uptime",
    value: "99.9%",
    change: "+0.1%",
    icon: <Activity className="w-6 h-6" />,
    color: "from-purple-500 to-indigo-500",
  },
]

export default function CustomerHome() {
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Violation[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSearch = () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    setTimeout(() => {
      const results = mockViolations.filter((violation) =>
        violation.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setSearchResults(results)
      setIsSearching(false)
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
      <MobileDropdownMenu showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />

      <main>
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900"></div>
            <div className="absolute inset-0 bg-black/20"></div>

            {/* Animated Elements */}
            <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-40 right-20 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-cyan-400/20 rounded-full blur-3xl animate-pulse delay-500"></div>

            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="h-full w-full"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
                  backgroundSize: "40px 40px",
                }}
              ></div>
            </div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
            <div className="text-center">
              {/* Live Status Indicator */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl rounded-full px-4 py-2 mb-8 border border-white/20">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white/90 text-sm font-medium">
                  System Online • {currentTime.toLocaleTimeString()}
                </span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                SurTraff

              </h1>

              <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-4xl mx-auto leading-relaxed">
                Advanced AI-powered traffic violation detection and monitoring system. Search violations, track
                compliance, and ensure road safety with real-time data.
              </p>

              {/* Enhanced Search Interface */}
              <div className="max-w-3xl mx-auto mb-16">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-2 border border-white/20 shadow-2xl">
                  <div className="flex items-center">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Enter license plate number (e.g., 30A-12345)"
                        className="w-full px-8 py-6 text-lg bg-white/90 backdrop-blur-xl border-0 rounded-2xl focus:ring-4 focus:ring-blue-500/30 focus:outline-none placeholder-gray-500 font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                      />
                      <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="ml-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 rounded-2xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                    >
                      {isSearching ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          <span className="font-semibold">Searching...</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Search className="h-5 w-5 mr-2" />
                          <span className="font-semibold">Search Now</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute top-1/4 right-10 opacity-20 animate-bounce">
            <Shield className="h-16 w-16 text-blue-300" />
          </div>
          <div className="absolute bottom-1/4 left-10 opacity-20 animate-pulse">
            <Eye className="h-20 w-20 text-purple-300" />
          </div>
        </div>

        {/* Features Section */}
        <div className="py-20 bg-white/50 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Advanced Traffic Monitoring Features</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Our AI-powered system provides comprehensive traffic monitoring and violation detection capabilities
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="group">
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 hover:scale-105">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Real-time Monitoring</h3>
                  <p className="text-gray-600 leading-relaxed">
                    24/7 surveillance with AI-powered detection across all major intersections and highways
                  </p>
                </div>
              </div>

              <div className="group">
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 hover:scale-105">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Instant Detection</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Advanced algorithms detect violations in real-time with 99.9% accuracy and instant alerts
                  </p>
                </div>
              </div>

              <div className="group">
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 hover:scale-105">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Smart Analytics</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Comprehensive reporting and analytics to identify traffic patterns and improve road safety
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Results or Recent Violations */}
        <div className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {hasSearched && (
              <div className="mb-12">
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20 mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Search Results for "{searchQuery}"</h2>
                  <p className="text-gray-600">
                    {searchResults.length} violation{searchResults.length !== 1 ? "s" : ""} found
                  </p>
                </div>

                {searchResults.length === 0 ? (
                  <div className="text-center py-16 bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20">
                    <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="h-12 w-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">No Violations Found</h3>
                    <p className="text-gray-600 text-lg">
                      This license plate has a clean record with no traffic violations
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((violation) => (
                      <div
                        key={violation.id}
                        className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-105 group"
                      >
                        <div className="relative">
                          <img
                            src={violation.image || "/placeholder.svg"}
                            alt="Violation evidence"
                            className="w-full h-48 object-cover bg-gray-200 group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute top-4 right-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-xl border ${
                                violation.status === "Processed"
                                  ? "bg-green-500/90 text-white border-green-400"
                                  : "bg-red-500/90 text-white border-red-400"
                              }`}
                            >
                              {violation.status}
                            </span>
                          </div>
                        </div>

                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                              {violation.plateNumber}
                            </span>
                          </div>

                          <h3 className="font-bold text-gray-900 mb-4 text-lg">{violation.violationType}</h3>

                          <div className="space-y-3 text-sm text-gray-600 mb-6">
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-3 text-blue-500" />
                              <span>{violation.location}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-3 text-green-500" />
                              <span>{violation.time}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-3 text-purple-500" />
                              <span>Fine: </span>
                              <span className="font-bold text-red-600 ml-1">{violation.fine}</span>
                            </div>
                          </div>

                          <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-6 rounded-2xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">
                            View Full Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!hasSearched && (
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Recent Traffic Violations</h2>
                      <p className="text-gray-600 mt-1">Latest violations detected by our monitoring system</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/50 rounded-full px-4 py-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">Live Data</span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                          License Plate
                        </th>
                        <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                          Violation Type
                        </th>
                        <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                          Time & Date
                        </th>
                        <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50">
                      {mockViolations.map((violation) => (
                        <tr key={violation.id} className="hover:bg-blue-50/50 transition-colors duration-200 group">
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mr-4">
                                <Car className="w-5 h-5 text-white" />
                              </div>
                              <div className="text-lg font-bold text-gray-900">{violation.plateNumber}</div>
                            </div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{violation.violationType}</div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="text-sm text-gray-600">{violation.time}</div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 text-sm font-bold rounded-full ${
                                violation.status === "Processed"
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : "bg-red-100 text-red-800 border border-red-200"
                              }`}
                            >
                              {violation.status === "Processed" ? (
                                <CheckCircle className="w-4 h-4 mr-1" />
                              ) : (
                                <XCircle className="w-4 h-4 mr-1" />
                              )}
                              {violation.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
