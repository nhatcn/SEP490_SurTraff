"use client"

import type React from "react"

import { useState, useRef } from "react"
import {
  Search,
  Car,
  MapPin,
  Clock,
  X,
  Eye,
  Upload,
  ImageIcon,
  Zap,
  Activity,
  Route,
  AlertCircle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Download,
  Share2,
  Maximize2,
} from "lucide-react"
import Sidebar from "../../../components/Layout/Sidebar"
import Header from "../../../components/Layout/Header"

interface VehicleInfo {
  brand: string
  licensePlate: string
  color: string
  searchImage?: File | null
}

interface CameraDetection {
  id: string | number
  name: string
  location: string
  detectionTime: string
  thumbnail: string
  confidence: number
  vehicleImage: string
  coordinates?: { lat: number; lng: number }
  status: "active" | "inactive"
}

interface TrackingResult {
  vehicle: VehicleInfo
  detections: CameraDetection[]
  totalCameras: number
  lastSeen: string
  status: "tracking" | "found" | "not_found"
  searchMethod: "text" | "image"
  trackingId: string
  route?: { lat: number; lng: number }[]
}

export default function VehicleTrackingDashboard() {
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo>({
    brand: "",
    licensePlate: "",
    color: "",
    searchImage: null,
  })

  const [isTracking, setIsTracking] = useState(false)
  const [trackingResults, setTrackingResults] = useState<TrackingResult | null>(null)
  const [searchHistory, setSearchHistory] = useState<VehicleInfo[]>([])
  const [searchMethod, setSearchMethod] = useState<"text" | "image">("text")
  const [dragActive, setDragActive] = useState(false)
  const [selectedDetection, setSelectedDetection] = useState<CameraDetection | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "timeline" | "map">("grid")
  const [isLiveTracking, setIsLiveTracking] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mock data for demo
  const mockCameras = [
    {
      id: 1,
      name: "Main Entrance",
      location: "Building A - Gate 1",
      thumbnail: "/placeholder.svg?height=300&width=400",
      coordinates: { lat: 10.8231, lng: 106.6297 },
      status: "active" as const,
    },
    {
      id: 2,
      name: "Parking Zone A",
      location: "North Side - Level 1",
      thumbnail: "/placeholder.svg?height=300&width=400",
      coordinates: { lat: 10.8241, lng: 106.6307 },
      status: "active" as const,
    },
    {
      id: 3,
      name: "Security Checkpoint",
      location: "Building B - Reception",
      thumbnail: "/placeholder.svg?height=300&width=400",
      coordinates: { lat: 10.8251, lng: 106.6317 },
      status: "active" as const,
    },
    {
      id: 4,
      name: "Loading Bay",
      location: "Warehouse - Dock 3",
      thumbnail: "/placeholder.svg?height=300&width=400",
      coordinates: { lat: 10.8261, lng: 106.6327 },
      status: "inactive" as const,
    },
    {
      id: 5,
      name: "Exit Terminal",
      location: "South Gate - Lane 2",
      thumbnail: "/placeholder.svg?height=300&width=400",
      coordinates: { lat: 10.8271, lng: 106.6337 },
      status: "active" as const,
    },
    {
      id: 6,
      name: "VIP Parking",
      location: "Executive Block",
      thumbnail: "/placeholder.svg?height=300&width=400",
      coordinates: { lat: 10.8281, lng: 106.6347 },
      status: "active" as const,
    },
  ]

  const handleInputChange = (field: keyof VehicleInfo, value: string) => {
    setVehicleInfo((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleImageUpload = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setVehicleInfo((prev) => ({
        ...prev,
        searchImage: file,
      }))
      setSearchMethod("image")
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0])
    }
  }

  const simulateTracking = async (vehicle: VehicleInfo, method: "text" | "image"): Promise<TrackingResult> => {
    // Simulate API delay with progress updates
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Mock detection logic - randomly select 2-6 cameras
    const numDetections = Math.floor(Math.random() * 5) + 2
    const selectedCameras = mockCameras.sort(() => Math.random() - 0.5).slice(0, numDetections)

    const detections: CameraDetection[] = selectedCameras.map((camera, index) => ({
      ...camera,
      detectionTime: new Date(Date.now() - index * 15 * 60 * 1000).toISOString(),
      confidence: Math.floor(Math.random() * 30) + 70,
      vehicleImage: `/placeholder.svg?height=200&width=300&text=Vehicle${index + 1}`,
    }))

    // Generate route coordinates
    const route = detections.map((d) => d.coordinates!).filter(Boolean)

    return {
      vehicle,
      detections: detections.sort((a, b) => new Date(b.detectionTime).getTime() - new Date(a.detectionTime).getTime()),
      totalCameras: detections.length,
      lastSeen: detections[0]?.detectionTime || new Date().toISOString(),
      status: detections.length > 0 ? "found" : "not_found",
      searchMethod: method,
      trackingId: `TRK-${Date.now()}`,
      route,
    }
  }

  const handleTrackVehicle = async () => {
    if (searchMethod === "text" && !vehicleInfo.licensePlate.trim()) {
      alert("Please enter license plate number or upload an image")
      return
    }

    if (searchMethod === "image" && !vehicleInfo.searchImage) {
      alert("Please upload an image to search")
      return
    }

    setIsTracking(true)
    setTrackingResults(null)

    try {
      const results = await simulateTracking(vehicleInfo, searchMethod)
      setTrackingResults(results)

      // Add to search history (only for text searches)
      if (searchMethod === "text" && vehicleInfo.licensePlate) {
        setSearchHistory((prev) => {
          const filtered = prev.filter((item) => item.licensePlate !== vehicleInfo.licensePlate)
          return [vehicleInfo, ...filtered].slice(0, 5)
        })
      }
    } catch (error) {
      console.error("Tracking failed:", error)
    } finally {
      setIsTracking(false)
    }
  }

  const clearSearch = () => {
    setVehicleInfo({ brand: "", licensePlate: "", color: "", searchImage: null })
    setTrackingResults(null)
    setSelectedDetection(null)
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const searchHistorySearch = (historyItem: VehicleInfo) => {
    setVehicleInfo(historyItem)
    setSearchMethod("text")
  }

  const exportResults = () => {
    if (!trackingResults) return

    const data = {
      trackingId: trackingResults.trackingId,
      vehicle: trackingResults.vehicle,
      detections: trackingResults.detections,
      exportTime: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `vehicle-tracking-${trackingResults.trackingId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar defaultActiveItem="vehicles" />

      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Vehicle Tracking System" />

        <div className="flex-1 overflow-auto p-6">
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Active Cameras</p>
                  <p className="text-3xl font-bold">{mockCameras.filter((c) => c.status === "active").length}</p>
                  <p className="text-blue-200 text-xs mt-1">+2 from yesterday</p>
                </div>
                <div className="bg-blue-400 bg-opacity-30 p-3 rounded-lg">
                  <Eye className="w-8 h-8 text-blue-100" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Vehicles Tracked</p>
                  <p className="text-3xl font-bold">1,247</p>
                  <p className="text-green-200 text-xs mt-1">+15% this week</p>
                </div>
                <div className="bg-green-400 bg-opacity-30 p-3 rounded-lg">
                  <Car className="w-8 h-8 text-green-100" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Detection Rate</p>
                  <p className="text-3xl font-bold">94.2%</p>
                  <p className="text-purple-200 text-xs mt-1">+2.1% accuracy</p>
                </div>
                <div className="bg-purple-400 bg-opacity-30 p-3 rounded-lg">
                  <Zap className="w-8 h-8 text-purple-100" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Live Tracking</p>
                  <p className="text-3xl font-bold">{isLiveTracking ? "1" : "0"}</p>
                  <p className="text-orange-200 text-xs mt-1">Real-time sessions</p>
                </div>
                <div className="bg-orange-400 bg-opacity-30 p-3 rounded-lg">
                  <Activity className="w-8 h-8 text-orange-100" />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Search Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                Vehicle Search & Tracking
              </h2>

              {/* Search Method Toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner">
                <button
                  onClick={() => setSearchMethod("text")}
                  className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    searchMethod === "text"
                      ? "bg-white text-blue-600 shadow-md transform scale-105"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <Search className="w-4 h-4 inline mr-2" />
                  Text Search
                </button>
                <button
                  onClick={() => setSearchMethod("image")}
                  className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    searchMethod === "image"
                      ? "bg-white text-blue-600 shadow-md transform scale-105"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <ImageIcon className="w-4 h-4 inline mr-2" />
                  Image Search
                </button>
              </div>
            </div>

            {searchMethod === "text" ? (
              /* Enhanced Text Search Form */
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">License Plate *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={vehicleInfo.licensePlate}
                        onChange={(e) => handleInputChange("licensePlate", e.target.value.toUpperCase())}
                        placeholder="e.g., 29A-12345"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Car className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Vehicle Brand</label>
                    <select
                      value={vehicleInfo.brand}
                      onChange={(e) => handleInputChange("brand", e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all"
                    >
                      <option value="">Select Brand</option>
                      <option value="Toyota">Toyota</option>
                      <option value="Honda">Honda</option>
                      <option value="Hyundai">Hyundai</option>
                      <option value="Ford">Ford</option>
                      <option value="Mazda">Mazda</option>
                      <option value="Kia">Kia</option>
                      <option value="Vinfast">VinFast</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Color</label>
                    <select
                      value={vehicleInfo.color}
                      onChange={(e) => handleInputChange("color", e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all"
                    >
                      <option value="">Select Color</option>
                      <option value="white">White</option>
                      <option value="black">Black</option>
                      <option value="silver">Silver</option>
                      <option value="red">Red</option>
                      <option value="blue">Blue</option>
                      <option value="gray">Gray</option>
                      <option value="yellow">Yellow</option>
                      <option value="green">Green</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* Enhanced Image Search Form */
              <div className="space-y-6">
                <div
                  className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 ${
                    dragActive
                      ? "border-blue-500 bg-blue-50 scale-105"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                    className="hidden"
                  />

                  {vehicleInfo.searchImage ? (
                    <div className="text-center">
                      <div className="inline-block relative group">
                        <img
                          src={URL.createObjectURL(vehicleInfo.searchImage) || "/placeholder.svg"}
                          alt="Search vehicle"
                          className="max-h-48 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow"
                        />
                        <button
                          onClick={() => setVehicleInfo((prev) => ({ ...prev, searchImage: null }))}
                          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 shadow-lg transform hover:scale-110 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mt-4 font-medium">{vehicleInfo.searchImage.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Size: {(vehicleInfo.searchImage.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Upload className="w-10 h-10 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-700 mb-3">Upload Vehicle Image</h3>
                      <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        Drag and drop a clear image of the vehicle here, or click to browse your files. Supported
                        formats: JPG, PNG, GIF (Max 10MB)
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
                      >
                        <ImageIcon size={18} className="inline mr-3" />
                        Choose Image
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Action Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleTrackVehicle}
                  disabled={
                    isTracking ||
                    (searchMethod === "text" && !vehicleInfo.licensePlate.trim()) ||
                    (searchMethod === "image" && !vehicleInfo.searchImage)
                  }
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center gap-3 transition-all transform hover:scale-105 shadow-lg disabled:transform-none"
                >
                  {isTracking ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Tracking Vehicle...</span>
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      <span>Start Tracking</span>
                    </>
                  )}
                </button>

                {((searchMethod === "text" && (vehicleInfo.licensePlate || vehicleInfo.brand || vehicleInfo.color)) ||
                  (searchMethod === "image" && vehicleInfo.searchImage)) && (
                  <button
                    onClick={clearSearch}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 flex items-center gap-2 transition-all hover:bg-gray-100 rounded-xl font-medium"
                  >
                    <X size={16} />
                    Clear Search
                  </button>
                )}

                {trackingResults && (
                  <button
                    onClick={() => setIsLiveTracking(!isLiveTracking)}
                    className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
                      isLiveTracking
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {isLiveTracking ? <Pause size={16} /> : <Play size={16} />}
                    {isLiveTracking ? "Stop Live" : "Start Live"}
                  </button>
                )}
              </div>

              {/* Search History */}
              {searchMethod === "text" && searchHistory.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-600">Recent Searches:</span>
                  <div className="flex gap-2">
                    {searchHistory.slice(0, 3).map((item, index) => (
                      <button
                        key={index}
                        onClick={() => searchHistorySearch(item)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 rounded-full transition-all hover:shadow-md transform hover:scale-105 font-medium"
                      >
                        {item.licensePlate}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Tracking Results */}
          {trackingResults && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Results Header */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">Tracking Results</h2>
                      <p className="text-gray-600">Tracking ID: {trackingResults.trackingId}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex bg-white rounded-lg p-1 shadow-sm border">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                          viewMode === "grid" ? "bg-blue-500 text-white" : "text-gray-600 hover:text-gray-800"
                        }`}
                      >
                        Grid
                      </button>
                      <button
                        onClick={() => setViewMode("timeline")}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                          viewMode === "timeline" ? "bg-blue-500 text-white" : "text-gray-600 hover:text-gray-800"
                        }`}
                      >
                        Timeline
                      </button>
                      <button
                        onClick={() => setViewMode("map")}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                          viewMode === "map" ? "bg-blue-500 text-white" : "text-gray-600 hover:text-gray-800"
                        }`}
                      >
                        Map
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <button
                      onClick={exportResults}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 font-medium"
                    >
                      <Download size={16} />
                      Export
                    </button>

                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 font-medium">
                      <Share2 size={16} />
                      Share
                    </button>
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mt-4 ${
                    trackingResults.status === "found" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {trackingResults.status === "found" ? (
                    <>
                      <CheckCircle size={16} />
                      Vehicle Found in {trackingResults.totalCameras} locations
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} />
                      Vehicle Not Found
                    </>
                  )}
                </div>
              </div>

              {/* Vehicle Summary */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700 block mb-1">Search Method:</span>
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                        trackingResults.searchMethod === "image"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {trackingResults.searchMethod === "image" ? <ImageIcon size={12} /> : <Search size={12} />}
                      {trackingResults.searchMethod === "image" ? "Image Search" : "Text Search"}
                    </div>
                  </div>

                  {trackingResults.searchMethod === "text" && trackingResults.vehicle.licensePlate && (
                    <div>
                      <span className="font-semibold text-gray-700 block mb-1">License Plate:</span>
                      <div className="text-lg font-bold text-blue-600">{trackingResults.vehicle.licensePlate}</div>
                    </div>
                  )}

                  {trackingResults.vehicle.brand && (
                    <div>
                      <span className="font-semibold text-gray-700 block mb-1">Brand:</span>
                      <div className="text-gray-800 font-medium">{trackingResults.vehicle.brand}</div>
                    </div>
                  )}

                  {trackingResults.vehicle.color && (
                    <div>
                      <span className="font-semibold text-gray-700 block mb-1">Color:</span>
                      <div className="text-gray-800 font-medium capitalize">{trackingResults.vehicle.color}</div>
                    </div>
                  )}

                  <div>
                    <span className="font-semibold text-gray-700 block mb-1">Last Seen:</span>
                    <div className="text-gray-800 font-medium">{formatTime(trackingResults.lastSeen)}</div>
                  </div>

                  <div>
                    <span className="font-semibold text-gray-700 block mb-1">Total Detections:</span>
                    <div className="text-2xl font-bold text-green-600">{trackingResults.totalCameras}</div>
                  </div>
                </div>
              </div>

              {/* Results Content */}
              <div className="p-6">
                {trackingResults.detections.length > 0 ? (
                  <>
                    {viewMode === "grid" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {trackingResults.detections.map((detection, index) => (
                          <div
                            key={detection.id}
                            className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:translate-y-[-4px] hover:border-blue-300 cursor-pointer group"
                            onClick={() => setSelectedDetection(detection)}
                          >
                            <div className="relative bg-gray-900 h-48 overflow-hidden">
                              <img
                                src={detection.vehicleImage || "/placeholder.svg"}
                                alt={`Vehicle at ${detection.name}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = detection.thumbnail
                                }}
                              />

                              {/* Detection Order Badge */}
                              <div className="absolute top-3 left-3 bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                                {index + 1}
                              </div>

                              {/* Confidence Badge */}
                              <div className="absolute top-3 right-3 bg-black bg-opacity-80 text-white px-3 py-1 rounded-full text-xs font-medium">
                                {detection.confidence}% match
                              </div>

                              {/* Status Indicator */}
                              <div
                                className={`absolute bottom-3 right-3 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                                  detection.status === "active" ? "bg-green-500 text-white" : "bg-gray-500 text-white"
                                }`}
                              >
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    detection.status === "active" ? "bg-white animate-pulse" : "bg-gray-300"
                                  }`}
                                ></div>
                                {detection.status === "active" ? "LIVE" : "OFFLINE"}
                              </div>

                              {/* Hover Overlay */}
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <Maximize2 className="w-8 h-8 text-white" />
                                </div>
                              </div>
                            </div>

                            <div className="p-4 space-y-3">
                              <h3 className="font-bold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">
                                {detection.name}
                              </h3>

                              <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <MapPin size={16} className="mr-2 text-blue-500 flex-shrink-0" />
                                <span className="truncate">{detection.location}</span>
                              </div>

                              <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <Clock size={16} className="mr-2 text-green-500 flex-shrink-0" />
                                <span>{formatTime(detection.detectionTime)}</span>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2 pt-2">
                                <button className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                                  <Eye size={14} className="inline mr-1" />
                                  View Live
                                </button>
                                <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                                  <Route size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {viewMode === "timeline" && (
                      <div className="space-y-6">
                        <div className="relative">
                          {/* Timeline Line */}
                          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-green-500"></div>

                          {trackingResults.detections.map((detection, index) => (
                            <div key={detection.id} className="relative flex items-start gap-6 pb-8">
                              {/* Timeline Node */}
                              <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {index + 1}
                              </div>

                              {/* Timeline Content */}
                              <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">{detection.name}</h3>
                                    <div className="flex items-center text-gray-600 mb-2">
                                      <MapPin size={16} className="mr-2" />
                                      <span>{detection.location}</span>
                                    </div>
                                    <div className="flex items-center text-gray-600">
                                      <Clock size={16} className="mr-2" />
                                      <span>{formatTime(detection.detectionTime)}</span>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                                      {detection.confidence}% match
                                    </div>
                                    <div
                                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        detection.status === "active"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {detection.status === "active" ? "LIVE" : "OFFLINE"}
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <img
                                    src={detection.vehicleImage || "/placeholder.svg"}
                                    alt={`Vehicle at ${detection.name}`}
                                    className="w-full h-32 object-cover rounded-lg"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.src = detection.thumbnail
                                    }}
                                  />
                                  <div className="flex flex-col justify-center space-y-2">
                                    <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
                                      <Eye size={16} className="inline mr-2" />
                                      View Live Feed
                                    </button>
                                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                                      <Download size={16} className="inline mr-2" />
                                      Download Image
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {viewMode === "map" && (
                      <div className="bg-gray-100 rounded-xl p-8 text-center">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MapPin className="w-10 h-10 text-blue-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Map View</h3>
                        <p className="text-gray-600 mb-6">Interactive map showing vehicle route and camera locations</p>
                        <div className="bg-white rounded-lg p-8 border-2 border-dashed border-gray-300">
                          <p className="text-gray-500">Map integration would be implemented here</p>
                          <p className="text-sm text-gray-400 mt-2">
                            Showing {trackingResults.detections.length} detection points
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Car size={40} className="text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Vehicle Not Found</h3>
                    <p className="text-lg mb-2">No detections found across all camera locations.</p>
                    <p className="text-sm text-gray-400 mb-6">
                      Try adjusting your search parameters or check again later.
                    </p>
                    <button
                      onClick={clearSearch}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      <RotateCcw size={16} className="inline mr-2" />
                      Try New Search
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detection Detail Modal */}
          {selectedDetection && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-800">{selectedDetection.name}</h3>
                    <button
                      onClick={() => setSelectedDetection(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <img
                        src={selectedDetection.vehicleImage || "/placeholder.svg"}
                        alt={`Vehicle at ${selectedDetection.name}`}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                        <p className="text-gray-800">{selectedDetection.location}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Detection Time</label>
                        <p className="text-gray-800">{formatTime(selectedDetection.detectionTime)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Confidence</label>
                        <p className="text-gray-800">{selectedDetection.confidence}%</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Camera Status</label>
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                            selectedDetection.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              selectedDetection.status === "active" ? "bg-green-500" : "bg-gray-500"
                            }`}
                          ></div>
                          {selectedDetection.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
                      <Eye size={16} className="inline mr-2" />
                      View Live Feed
                    </button>
                    <button className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                      <Download size={16} className="inline mr-2" />
                      Download Image
                    </button>
                    <button className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                      <Share2 size={16} className="inline mr-2" />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
