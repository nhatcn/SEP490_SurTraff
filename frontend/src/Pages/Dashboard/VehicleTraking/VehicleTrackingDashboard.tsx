"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
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
  Camera,
  Navigation,
  Video,
  Monitor,
  Grid3X3,
  Maximize,
  Minimize,
} from "lucide-react"
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import Sidebar from "../../../components/Layout/Sidebar"
import Header from "../../../components/Layout/Header"

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom icons for different marker types
const cameraIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="blue" width="32" height="32">
      <rect x="2" y="6" width="20" height="12" rx="2" fill="#3b82f6" stroke="white" stroke-width="1"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
      <rect x="20" y="9" width="2" height="6" fill="#3b82f6"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
})

const trackingIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64=" + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" width="28" height="28">
      <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="white" stroke-width="2"/>
      <path d="M8 12h8M12 8v8" stroke="white" stroke-width="2"/>
    </svg>
  `),
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14]
})

interface VehicleInfo {
  brand: string
  licensePlate: string
  color: string
  searchImage?: File | null
}

interface CameraData {
  id: number
  name: string
  latitude: number
  longitude: number
  location: string
  status: boolean
  stream_url: string
  thumbnail: string
}

interface CameraStream {
  cameraId: number
  cameraName: string
  location: string
  latitude?: number
  longitude?: number
  streamUrl: string
  status: "active" | "inactive"
  thumbnail?: string
}

interface TrackingSession {
  sessionId: string
  cameraIds: number[]
  cameraStreams: CameraStream[]
  vehicle: VehicleInfo
  startTime: string
  status: "active" | "inactive"
  searchMethod: "text" | "image"
  totalCameras: number
}

interface LocationSearchResult {
  display_name: string
  lat: string
  lon: string
  boundingbox: string[]
}

// Vietnamese text normalization function
const normalizeVietnamese = (text: string): string => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export default function VehicleTrackingDashboard() {
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo>({
    brand: "",
    licensePlate: "",
    color: "",
    searchImage: null,
  })

  const [isTracking, setIsTracking] = useState(false)
  const [trackingSession, setTrackingSession] = useState<TrackingSession | null>(null)
  const [searchHistory, setSearchHistory] = useState<VehicleInfo[]>([])
  const [searchMethod, setSearchMethod] = useState<"text" | "image">("text")
  const [dragActive, setDragActive] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "map" | "single">("grid")
  const [selectedCameraId, setSelectedCameraId] = useState<number | null>(null)
  const [fullscreenCamera, setFullscreenCamera] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Map related states
  const [cameras, setCameras] = useState<CameraData[]>([])
  const [isLoadingCameras, setIsLoadingCameras] = useState(false)
  const [mapRef, setMapRef] = useState<L.Map | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.021892, 105.765306]) // Can Tho default
  const [mapZoom, setMapZoom] = useState(10)

  // Location search states
  const [locationSearchQuery, setLocationSearchQuery] = useState("")
  const [filteredCameras, setFilteredCameras] = useState<CameraData[]>([])
  const [selectedCameraIds, setSelectedCameraIds] = useState<number[]>([])

  // Load cameras from API
  useEffect(() => {
    loadCameras()
  }, [])

  // Filter cameras based on location search
  useEffect(() => {
    if (locationSearchQuery.trim()) {
      const normalizedQuery = normalizeVietnamese(locationSearchQuery)
      const filtered = cameras.filter(camera =>
        normalizeVietnamese(camera.location).includes(normalizedQuery)
      )
      setFilteredCameras(filtered)

      // Adjust map view to show filtered cameras
      if (filtered.length > 0) {
        const bounds = L.latLngBounds(filtered.map(camera => [camera.latitude, camera.longitude]))
        if (mapRef) {
          mapRef.fitBounds(bounds, { padding: [20, 20] })
        }
      }
    } else {
      setFilteredCameras(cameras)
    }
  }, [locationSearchQuery, cameras, mapRef])

  const loadCameras = async () => {
    setIsLoadingCameras(true)
    try {
      const response = await fetch('http://localhost:8000/api/cameras')
      if (response.ok) {
        const data = await response.json()
        const formattedCameras: CameraData[] = data.map((camera: any) => ({
          id: camera.id,
          name: camera.name,
          latitude: camera.latitude,
          longitude: camera.longitude,
          location: camera.location,
          status: camera.status,
          stream_url: camera.stream_url,
          thumbnail: camera.thumbnail
        }))
        setCameras(formattedCameras)
        setFilteredCameras(formattedCameras)
      } else {
        console.error('Failed to load cameras')
      }
    } catch (error) {
      console.error('Error loading cameras:', error)
    } finally {
      setIsLoadingCameras(false)
    }
  }

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

  const handleCameraSelect = (cameraId: number) => {
    setSelectedCameraIds(prev => {
      if (prev.includes(cameraId)) {
        return prev.filter(id => id !== cameraId)
      } else {
        return [...prev, cameraId]
      }
    })
  }

  const handleStartTracking = async () => {
    if (selectedCameraIds.length === 0) {
      alert("Please select at least one camera for tracking");
      return;
    }

    if (searchMethod === "text" && !vehicleInfo.licensePlate.trim()) {
      alert("Please enter license plate number or upload an image");
      return;
    }

    if (searchMethod === "image" && !vehicleInfo.searchImage) {
      alert("Please upload an image to search");
      return;
    }

    setIsTracking(true);
    setTrackingSession(null);

    try {
      let response;

      if (searchMethod === "image") {
        // Use FormData for image search
        const formData = new FormData();

        // Send camera_ids as a proper JSON string
        formData.append("camera_ids_form", JSON.stringify(selectedCameraIds));

        if (vehicleInfo.brand) formData.append("brand", vehicleInfo.brand);
        if (vehicleInfo.licensePlate) formData.append("license_plate", vehicleInfo.licensePlate);
        if (vehicleInfo.color) formData.append("color", vehicleInfo.color);
        if (vehicleInfo.searchImage) formData.append("search_image", vehicleInfo.searchImage);

        response = await fetch("http://localhost:8000/api/tracking/start_session", {
          method: "POST",
          body: formData,
        });
      } else {
        // Use JSON body for text search
        const body = {
          camera_ids: selectedCameraIds, // This will be handled as JSON body parameter
          brand: vehicleInfo.brand || undefined,
          license_plate: vehicleInfo.licensePlate || undefined,
          color: vehicleInfo.color || undefined,
        };

        response = await fetch("http://localhost:8000/api/tracking/start_session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
      }

      if (response.ok) {
        const session: TrackingSession = await response.json();
        setTrackingSession(session);

        if (searchMethod === "text" && vehicleInfo.licensePlate) {
          setSearchHistory((prev) => {
            const filtered = prev.filter((item) => item.licensePlate !== vehicleInfo.licensePlate);
            return [vehicleInfo, ...filtered].slice(0, 5);
          });
        }

        setViewMode("grid");
      } else {
        const error = await response.json();
        console.error("API Error:", error);
        alert(`Tracking failed: ${error.detail}`);
      }
    } catch (error) {
      console.error("Tracking failed:", error);
      alert("Tracking failed. Please try again.");
    } finally {
      setIsTracking(false);
    }
  };
  const handleStopTracking = () => {
    setTrackingSession(null)
    setSelectedCameraIds([])
    setFullscreenCamera(null)
    setSelectedCameraId(null)
  }

  const clearSearch = () => {
    setVehicleInfo({ brand: "", licensePlate: "", color: "", searchImage: null })
    setTrackingSession(null)
    setSelectedCameraIds([])
    setFullscreenCamera(null)
    setSelectedCameraId(null)
  }

  const clearLocationFilter = () => {
    setLocationSearchQuery("")
    setFilteredCameras(cameras)
    setMapCenter([10.021892, 105.765306])
    setMapZoom(10)
    if (mapRef) {
      mapRef.setView([10.021892, 105.765306], 10)
    }
  }

  const searchHistorySearch = (historyItem: VehicleInfo) => {
    setVehicleInfo(historyItem)
    setSearchMethod("text")
  }

  const getStreamUrl = (cameraStream: CameraStream) => {
    const baseUrl = "http://localhost:8000"
    if (searchMethod === "image" && vehicleInfo.searchImage) {
      return `${baseUrl}/api/tracking/stream_with_image/${cameraStream.cameraId}`
    } else {
      const params = new URLSearchParams()
      if (vehicleInfo.licensePlate) params.append('license_plate', vehicleInfo.licensePlate)
      if (vehicleInfo.brand) params.append('brand', vehicleInfo.brand)
      if (vehicleInfo.color) params.append('color', vehicleInfo.color)
      return `${baseUrl}/api/tracking/stream/${cameraStream.cameraId}?${params.toString()}`
    }
  }

  // Helper function to check if tracking can start
  const canStartTracking = () => {
    console.log("=== Tracking Check ===")
    console.log("isTracking:", isTracking)
    console.log("selectedCameraIds:", selectedCameraIds)
    console.log("searchMethod:", searchMethod)
    console.log("licensePlate:", vehicleInfo.licensePlate)
    console.log("searchImage:", vehicleInfo.searchImage)

    if (isTracking) {
      console.log("❌ Cannot start: Already tracking")
      return false
    }

    if (selectedCameraIds.length === 0) {
      console.log("❌ Cannot start: No cameras selected")
      return false
    }

    if (searchMethod === "text" && !vehicleInfo.licensePlate.trim()) {
      console.log("❌ Cannot start: Text search but no license plate")
      return false
    }

    if (searchMethod === "image" && !vehicleInfo.searchImage) {
      console.log("❌ Cannot start: Image search but no image uploaded")
      return false
    }

    console.log("✅ Can start tracking!")
    return true
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar defaultActiveItem="vehicles" />

      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Vehicle Tracking System" />

        <div className="flex-1 overflow-auto p-6">
          {/* Location Filter Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-white" />
                </div>
                Camera Selection & Location Filter
              </h2>
              {(locationSearchQuery || selectedCameraIds.length > 0) && (
                <div className="flex gap-2">
                  {locationSearchQuery && (
                    <button
                      onClick={clearLocationFilter}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2 transition-all hover:bg-gray-100 rounded-lg font-medium"
                    >
                      <X size={16} />
                      Clear Filter
                    </button>
                  )}
                  {selectedCameraIds.length > 0 && (
                    <button
                      onClick={() => setSelectedCameraIds([])}
                      className="px-4 py-2 text-red-600 hover:text-red-800 flex items-center gap-2 transition-all hover:bg-red-100 rounded-lg font-medium"
                    >
                      <X size={16} />
                      Clear Selection
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-4 items-center mb-4">
              <div className="flex-1 relative max-w-md">
                <input
                  type="text"
                  value={locationSearchQuery}
                  onChange={(e) => setLocationSearchQuery(e.target.value)}
                  placeholder="Search by city, district in Vietnam (e.g., Can Tho, HCM)..."
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="text-sm text-gray-600">
                {locationSearchQuery ? (
                  <span className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg font-medium">
                    Filtered: {locationSearchQuery} ({filteredCameras.length} cameras)
                  </span>
                ) : (
                  <span>Showing all {cameras.length} cameras</span>
                )}
              </div>

              {selectedCameraIds.length > 0 && (
                <div className="text-sm">
                  <span className="bg-green-100 text-green-800 px-3 py-2 rounded-lg font-medium">
                    Selected: {selectedCameraIds.length} cameras
                  </span>
                </div>
              )}
            </div>

            {/* Camera Selection Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {filteredCameras.map((camera) => (
                <div
                  key={camera.id}
                  onClick={() => handleCameraSelect(camera.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${selectedCameraIds.includes(camera.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                >
                  <div className="text-sm font-medium text-gray-800 truncate">{camera.name}</div>
                  <div className="text-xs text-gray-600 truncate">{camera.location}</div>
                  <div className={`text-xs mt-1 inline-flex items-center gap-1 ${camera.status ? "text-green-600" : "text-red-600"
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${camera.status ? "bg-green-500" : "bg-red-500"
                      }`}></div>
                    {camera.status ? "Active" : "Offline"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                Vehicle Search & Tracking
              </h2>

              <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner">
                <button
                  onClick={() => setSearchMethod("text")}
                  className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${searchMethod === "text"
                    ? "bg-white text-blue-600 shadow-md transform scale-105"
                    : "text-gray-600 hover:text-gray-800"
                    }`}
                >
                  <Search className="w-4 h-4 inline mr-2" />
                  Text Search
                </button>
                <button
                  onClick={() => setSearchMethod("image")}
                  className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${searchMethod === "image"
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
              <div className="space-y-6">
                <div
                  className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 ${dragActive
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
                          src={URL.createObjectURL(vehicleInfo.searchImage)}
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

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-4">
                {/* Debug Info - Remove in production */}
                <div className="text-xs bg-gray-100 px-3 py-2 rounded text-gray-600">
                  Debug: Cameras({selectedCameraIds.length}) |
                  Method({searchMethod}) |
                  LP({vehicleInfo.licensePlate || 'none'}) |
                  Img({vehicleInfo.searchImage ? 'yes' : 'no'}) |
                  Tracking({isTracking ? 'yes' : 'no'})
                </div>

                <button
                  onClick={handleStartTracking}
                  disabled={!canStartTracking()}
                  className={`px-8 py-3 rounded-xl font-semibold flex items-center gap-3 transition-all shadow-lg ${!canStartTracking()
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transform hover:scale-105"
                    }`}
                >
                  {isTracking ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Starting Tracking...</span>
                    </>
                  ) : (
                    <>
                      <Video size={18} />
                      <span>Start Live Tracking</span>
                    </>
                  )}
                </button>

                {trackingSession && (
                  <button
                    onClick={handleStopTracking}
                    className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
                  >
                    <Pause size={16} />
                    Stop Tracking
                  </button>
                )}

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
              </div>

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

          {/* Live Tracking Section */}
          {trackingSession && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">Live Vehicle Tracking</h2>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-gray-600">Session ID: {trackingSession.sessionId}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-green-600 font-medium">LIVE</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex bg-white rounded-lg p-1 shadow-sm border">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "grid" ? "bg-blue-500 text-white" : "text-gray-600 hover:text-gray-800"
                          }`}
                      >
                        <Grid3X3 size={16} className="inline mr-1" />
                        Grid
                      </button>
                      <button
                        onClick={() => setViewMode("single")}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "single" ? "bg-blue-500 text-white" : "text-gray-600 hover:text-gray-800"
                          }`}
                      >
                        <Monitor size={16} className="inline mr-1" />
                        Single
                      </button>
                      <button
                        onClick={() => setViewMode("map")}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "map" ? "bg-blue-500 text-white" : "text-gray-600 hover:text-gray-800"
                          }`}
                      >
                        <MapPin size={16} className="inline mr-1" />
                        Map
                      </button>
                    </div>

                    <button
                      onClick={handleStopTracking}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 font-medium"
                    >
                      <X size={16} />
                      Stop Tracking
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700 block mb-1">Search Method:</span>
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${trackingSession.searchMethod === "image"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                        }`}
                    >
                      {trackingSession.searchMethod === "image" ? <ImageIcon size={12} /> : <Search size={12} />}
                      {trackingSession.searchMethod === "image" ? "Image Search" : "Text Search"}
                    </div>
                  </div>

                  {trackingSession.searchMethod === "text" && trackingSession.vehicle.licensePlate && (
                    <div>
                      <span className="font-semibold text-gray-700 block mb-1">License Plate:</span>
                      <div className="text-lg font-bold text-blue-600">{trackingSession.vehicle.licensePlate}</div>
                    </div>
                  )}

                  {trackingSession.vehicle.brand && (
                    <div>
                      <span className="font-semibold text-gray-700 block mb-1">Brand:</span>
                      <div className="text-gray-800 font-medium">{trackingSession.vehicle.brand}</div>
                    </div>
                  )}

                  {trackingSession.vehicle.color && (
                    <div>
                      <span className="font-semibold text-gray-700 block mb-1">Color:</span>
                      <div className="text-gray-800 font-medium capitalize">{trackingSession.vehicle.color}</div>
                    </div>
                  )}

                  <div>
                    <span className="font-semibold text-gray-700 block mb-1">Active Cameras:</span>
                    <div className="text-2xl font-bold text-green-600">{trackingSession.totalCameras}</div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {viewMode === "grid" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {trackingSession.cameraStreams.map((cameraStream) => (
                      <div
                        key={cameraStream.cameraId}
                        className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-blue-300"
                      >
                        <div className="relative bg-black aspect-video">
                          <img
                            src={getStreamUrl(cameraStream)}
                            alt={`Live stream from ${cameraStream.cameraName}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to placeholder on error
                              const target = e.target as HTMLImageElement
                              target.src = "/placeholder.svg?height=200&width=300&text=Camera+Offline"
                            }}
                          />
                          <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            LIVE
                          </div>
                          <div
                            className={`absolute top-3 right-3 px-2 py-1 rounded text-xs font-medium ${cameraStream.status === "active" ? "bg-green-500 text-white" : "bg-gray-500 text-white"
                              }`}
                          >
                            {cameraStream.status === "active" ? "ACTIVE" : "OFFLINE"}
                          </div>
                          <button
                            onClick={() => setFullscreenCamera(cameraStream.cameraId)}
                            className="absolute bottom-3 right-3 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-all"
                          >
                            <Maximize2 size={16} />
                          </button>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-gray-800 text-lg mb-2">{cameraStream.cameraName}</h3>
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <MapPin size={16} className="mr-2 text-blue-500 flex-shrink-0" />
                            <span className="truncate">{cameraStream.location}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-gray-500">
                              Camera ID: {cameraStream.cameraId}
                            </div>
                            <button
                              onClick={() => {
                                setSelectedCameraId(cameraStream.cameraId)
                                setViewMode("single")
                              }}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                            >
                              View Single
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {viewMode === "single" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <select
                          value={selectedCameraId || ""}
                          onChange={(e) => setSelectedCameraId(Number(e.target.value))}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Camera</option>
                          {trackingSession.cameraStreams.map((stream) => (
                            <option key={stream.cameraId} value={stream.cameraId}>
                              {stream.cameraName} - {stream.location}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setViewMode("grid")}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                          <Grid3X3 size={16} />
                          Back to Grid
                        </button>
                      </div>
                    </div>

                    {selectedCameraId && (
                      <div className="bg-black rounded-xl overflow-hidden">
                        <div className="relative aspect-video">
                          <img
                            src={getStreamUrl(trackingSession.cameraStreams.find(s => s.cameraId === selectedCameraId)!)}
                            alt={`Live stream from camera ${selectedCameraId}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "/placeholder.svg?height=400&width=800&text=Camera+Offline"
                            }}
                          />
                          <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-2 rounded text-sm font-bold flex items-center gap-2">
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                            LIVE TRACKING
                          </div>
                          <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
                            <div className="font-bold">
                              {trackingSession.cameraStreams.find(s => s.cameraId === selectedCameraId)?.cameraName}
                            </div>
                            <div className="text-sm opacity-90">
                              {trackingSession.cameraStreams.find(s => s.cameraId === selectedCameraId)?.location}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {!selectedCameraId && (
                      <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                        <Camera size={48} className="mx-auto mb-4 text-gray-400" />
                        <p className="text-xl font-semibold mb-2">No Camera Selected</p>
                        <p>Please select a camera from the dropdown above to view live tracking</p>
                      </div>
                    )}
                  </div>
                )}

                {viewMode === "map" && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="p-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-blue-500" />
                          Live Tracking Camera Locations
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Showing {trackingSession.cameraStreams.length} active tracking cameras
                        </p>
                      </div>
                      <div className="h-96">
                        <MapContainer
                          center={mapCenter}
                          zoom={mapZoom}
                          style={{ height: "100%", width: "100%" }}
                          key={`tracking-map-${trackingSession.sessionId}`}
                          ref={setMapRef}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          />
                          {trackingSession.cameraStreams.map((stream) => {
                            const camera = cameras.find(c => c.id === stream.cameraId)
                            if (!camera) return null

                            return (
                              <Marker
                                key={`tracking-camera-${stream.cameraId}`}
                                position={[camera.latitude, camera.longitude]}
                                icon={trackingIcon}
                              >
                                <Popup>
                                  <div className="p-2">
                                    <h4 className="font-bold text-gray-800">{stream.cameraName}</h4>
                                    <p className="text-sm text-gray-600 mb-2">{stream.location}</p>
                                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mb-2 ${stream.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                      }`}>
                                      <div className={`w-2 h-2 rounded-full ${stream.status === "active" ? "bg-green-500 animate-pulse" : "bg-gray-500"
                                        }`}></div>
                                      {stream.status === "active" ? "LIVE TRACKING" : "OFFLINE"}
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          setSelectedCameraId(stream.cameraId)
                                          setViewMode("single")
                                        }}
                                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                      >
                                        View Stream
                                      </button>
                                    </div>
                                  </div>
                                </Popup>
                              </Marker>
                            )
                          })}
                        </MapContainer>
                      </div>
                      <div className="p-4 bg-gray-50 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-red-500"></div>
                              <span className="text-gray-600">Active Tracking ({trackingSession.cameraStreams.length})</span>
                            </div>
                          </div>
                          <div className="text-gray-500">
                            Session ID: {trackingSession.sessionId}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fullscreen Camera Modal */}
          {fullscreenCamera && trackingSession && (
            <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
              <div className="relative w-full h-full max-w-7xl max-h-screen p-4">
                <button
                  onClick={() => setFullscreenCamera(null)}
                  className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg hover:bg-opacity-70 transition-all z-10"
                >
                  <Minimize size={24} />
                </button>
                <div className="w-full h-full bg-black rounded-xl overflow-hidden">
                  <img
                    src={getStreamUrl(trackingSession.cameraStreams.find(s => s.cameraId === fullscreenCamera)!)}
                    alt={`Fullscreen live stream from camera ${fullscreenCamera}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=600&width=1200&text=Camera+Offline"
                    }}
                  />
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
                    <div className="font-bold text-lg">
                      {trackingSession.cameraStreams.find(s => s.cameraId === fullscreenCamera)?.cameraName}
                    </div>
                    <div className="text-sm opacity-90">
                      {trackingSession.cameraStreams.find(s => s.cameraId === fullscreenCamera)?.location}
                    </div>
                  </div>
                  <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-2 rounded text-sm font-bold flex items-center gap-2">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    LIVE TRACKING - FULLSCREEN
                  </div>
                </div>
              </div>
            </div>
          )}

          {isLoadingCameras && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="flex items-center justify-center gap-3 text-gray-600">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading cameras from API...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}