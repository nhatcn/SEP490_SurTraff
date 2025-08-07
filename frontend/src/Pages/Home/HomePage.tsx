"use client"

import type React from "react"
import { Shield, Eye, BarChart3, Camera, AlertTriangle, CheckCircle, Activity, Zap } from "lucide-react"
import { useState, useEffect } from "react"
import { Header, MobileDropdownMenu } from "../../components/Layout/Menu"
import Footer from "../../components/Layout/Footer"
import { SearchBar } from "../../components/HomeSearch/search-bar"
import RecentViolationsSection from "../../components/RecentViolationsSection"
import { getCookie } from "../../utils/cookieUltil"
import Chatbot from "../../components/Chatbot/chatbot"

interface StatCard {
  title: string
  value: string
  change: string
  icon: React.ReactNode
  color: string
}

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

// Background Slideshow Component
function BackgroundSlideshow() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const backgroundImages = [
    "https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/blogs/22606/images/f082d2-6b14-c6a-8076-3304cc3a6c4_vlcsnap-error246.png",
  ]
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [backgroundImages.length])
  return (
    <div className="relative w-full h-full">
      {backgroundImages.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentImageIndex ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={image || "/placeholder.svg"}
            alt={`Background ${index + 1}`}
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.7) contrast(1.1)" }}
          />
        </div>
      ))}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-50">
        {backgroundImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentImageIndex ? "bg-white shadow-lg scale-110" : "bg-white/50 hover:bg-white/70"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function CustomerHome() {
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [currentSearchQuery, setCurrentSearchQuery] = useState("")
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
// New function to reset search
  const resetSearch = () => {
    setSearchResults([])
    setHasSearched(false)
    setCurrentSearchQuery("")
  }
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setHasSearched(false)
      setCurrentSearchQuery("")
      return
    }
    setCurrentSearchQuery(query)
    setIsSearching(true)
    setHasSearched(true)

    try {
      const userId = getCookie("userId") // Get userId from cookie
      if (!userId) {
        throw new Error("User ID not found in cookie")
      }
      const response = await fetch(`http://localhost:8081/api/accident/user/${userId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      const transformedData = data
        .map((item: any) => {
          let displayStatusText = item.status
          if (item.status === "Approved") {
            displayStatusText = "New"
          }
          return {
            id: item.id,
            plateNumber: item.licensePlate,
            violationType: item.description,
            location: item.location,
            time: new Date(item.accidentTime).toLocaleString(),
            status: item.status,
            displayStatus: displayStatusText,
            image: item.imageUrl || "/placeholder.svg",
          }
        })
        .filter(
          (violation: any) =>
            (violation.status === "Approved" ||
              violation.status === "Requested" ||
              violation.status === "Processed" ||
              violation.status === "Rejected") &&
            violation.plateNumber.toLowerCase().includes(query.toLowerCase()),
        )
      setSearchResults(transformedData)
    } catch (error) {
      console.error("Failed to fetch search results:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
      <MobileDropdownMenu showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
      <main>
        <div className="relative overflow-hidden min-h-[70vh]">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-700/10 via-indigo-900/20 to-purple-900/80 z-10"></div>
            <div className="absolute inset-0 bg-black/40 z-20"></div>
            <div className="absolute inset-0 z-0">
              <BackgroundSlideshow />
            </div>
            <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl animate-pulse z-30"></div>
            <div className="absolute top-40 right-20 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000 z-30"></div>
            <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-cyan-400/20 rounded-full blur-3xl animate-pulse delay-500 z-30"></div>
            <div className="absolute inset-0 opacity-10 z-30">
              <div
                className="h-full w-full"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
                  backgroundSize: "40px 40px",
                }}
              ></div>
            </div>
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 z-40">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl rounded-full px-4 py-2 mb-8 border border-white/20">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white/90 text-sm font-medium">
                  System Online • {currentTime.toLocaleTimeString()}
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">SurTraff</h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-4xl mx-auto leading-relaxed">
                Advanced AI-powered traffic violation detection and monitoring system. Search violations, track
                compliance, and ensure road safety with real-time data.
              </p>
              <SearchBar onSearch={handleSearch} isSearching={isSearching} />
            </div>
          </div>
          <div className="absolute top-1/4 right-10 opacity-20 animate-bounce z-40">
            <Shield className="h-16 w-16 text-blue-300" />
          </div>
          <div className="absolute bottom-1/4 left-10 opacity-20 animate-pulse z-40">
            <Eye className="h-20 w-20 text-purple-300" />
          </div>
        </div>
        <div className="py-20 bg-white/50 backdrop-blur-xl relative z-[10]">
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
                  <p className="text-gray-600 leading-relaxed">Advanced algorithms detect violations in real-time</p>
                </div>
              </div>
              <div className="group">
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 hover:scale-105">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Smart Analytics</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Comprehensive reporting and analytics to identify traffic patterns and improve safety
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
       <RecentViolationsSection
          hasSearched={hasSearched}
          searchResults={searchResults}
          isSearching={isSearching}
          currentSearchQuery={currentSearchQuery}
          resetSearch={resetSearch} // Pass the resetSearch function
        />
      </main>
      <Chatbot/>
      <Footer />
    </div>
  )
}