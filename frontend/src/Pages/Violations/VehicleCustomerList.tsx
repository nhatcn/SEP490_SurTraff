"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Car,
  Palette,
  Search,
  Filter,
  ChevronDown,
  X,
  ArrowLeft,
  Bot,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  List,
  LayoutGrid,
  PlusCircle,
} from "lucide-react"

interface VehicleDTO {
  id: number
  name: string
  licensePlate: string
  userId: number
  vehicleTypeId: number
  color: string
  brand: string
}

interface ViolationDetail {
  id: number
  violationId: number
  violationTypeId: number
  violationType: {
    id: number
    typeName: string
    description: string
  }
  imageUrl: string
  videoUrl: string
  location: string
  violationTime?: string
  speed: number
  additionalNotes: string
  createdAt: string
  licensePlate: string
}

interface ViolationData {
  id: number
  camera: {
    id: number
    name: string
    location: string
    streamUrl: string
    thumbnail: string
    zoneId: number
    latitude: number
    longitude: number
  }
  vehicleType: {
    id: number
    typeName: string
  }
  vehicle: {
    id: number
    name: string
    licensePlate: string
    userId: number
    vehicleTypeId: number
    color: string
    brand: string
  }
  createdAt: string
  violationDetails: ViolationDetail[]
  status: string
}

interface VehicleCustomerListProps {
  userId: number
  onBack?: () => void
}

const VehicleCustomerList: React.FC<VehicleCustomerListProps> = ({ onBack }) => {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<VehicleDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filterBrand, setFilterBrand] = useState("")
  const [violations, setViolations] = useState<{ [key: string]: ViolationData[] }>({})
  const [robotMessage, setRobotMessage] = useState("")
  const [robotMessageType, setRobotMessageType] = useState<"info" | "success" | "warning" | "error">("info")
  const [showRobotMessage, setShowRobotMessage] = useState(false)
  const [robotIsChecking, setRobotIsChecking] = useState(false)
  const [firstViolatedPlate, setFirstViolatedPlate] = useState<string | null>(null)
  const [isCompactView, setIsCompactView] = useState(false)
  // const [isGeneratingReport, setIsGeneratingReport] = useState(false) // Removed
  // const [isCheckingMaintenance, setIsCheckingMaintenance] = useState(false) // Removed

  // NOTE: In a real application, this API_URL should be an environment variable.
  // For this example, it's hardcoded as per the original request.
  const API_URL = "http://localhost:8081"

  // Get unique brands
  const brands = useMemo(() => {
    const uniqueBrands = new Set<string>()
    vehicles.forEach((vehicle) => {
      if (vehicle.brand) uniqueBrands.add(vehicle.brand)
    })
    return Array.from(uniqueBrands)
  }, [vehicles])

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const matchesSearch =
        !searchTerm ||
        vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesBrand = !filterBrand || vehicle.brand === filterBrand
      return matchesSearch && matchesBrand
    })
  }, [vehicles, searchTerm, filterBrand])

  // Load vehicles list
  const loadVehicles = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Using userId from props, but original code used hardcoded '3'.
      // Sticking to original behavior for now.
      const response = await fetch(`${API_URL}/api/vehicle/user/3`)
      if (!response.ok) {
        if (response.status === 404) {
          setError("No vehicles found for this user.")
        } else {
          setError("An error occurred while loading the vehicles list.")
        }
        return
      }
      const data: VehicleDTO[] = await response.json()
      setVehicles(data)
      // Check violations for all vehicles after loading
      checkAllVehicleViolations(data)
    } catch (err) {
      setError("An error occurred while loading the vehicles list.")
    } finally {
      setIsLoading(false)
    }
  }, [API_URL])

  // Check violations for a specific license plate
  const checkViolations = useCallback(
    async (licensePlate: string) => {
      try {
        const response = await fetch(`${API_URL}/api/violations/license-plate/${licensePlate}`)
        if (response.ok) {
          const violationData: ViolationData[] = await response.json()
          setViolations((prev) => ({
            ...prev,
            [licensePlate]: violationData,
          }))
          return violationData
        }
        return []
      } catch (err) {
        console.error(`Error checking violations for ${licensePlate}:`, err)
        return []
      }
    },
    [API_URL],
  )

  // Check violations for all vehicles and show robot message
  const checkAllVehicleViolations = useCallback(
    async (vehicleList: VehicleDTO[]) => {
      setRobotIsChecking(true)
      setRobotMessage("Checking violations for all vehicles...")
      setRobotMessageType("info")
      setShowRobotMessage(true)
      setFirstViolatedPlate(null) // Reset first violated plate

      const violationPromises = vehicleList.map((vehicle) => checkViolations(vehicle.licensePlate))

      try {
        const allViolations = await Promise.all(violationPromises)

        let totalViolations = 0
        let foundFirstViolated = false
        const violatedVehiclesCount = allViolations.filter((v, index) => {
          if (v.length > 0) {
            totalViolations += v.length
            if (!foundFirstViolated) {
              setFirstViolatedPlate(vehicleList[index].licensePlate)
              foundFirstViolated = true
            }
            return true
          }
          return false
        }).length

        // Generate robot message
        setTimeout(() => {
          if (totalViolations === 0) {
            setRobotMessage("Great! All your vehicles have no violations!")
            setRobotMessageType("success")
          } else if (violatedVehiclesCount === 1) {
            setRobotMessage(`Vehicle ${firstViolatedPlate} has violations. Please check!`)
            setRobotMessageType("warning")
          } else {
            setRobotMessage(
              `There are ${violatedVehiclesCount} vehicles with violations. Please check the list below for details.`,
            )
            setRobotMessageType("warning")
          }
          setRobotIsChecking(false)

          // Hide message after 8 seconds
          setTimeout(() => {
            setShowRobotMessage(false)
          }, 8000)
        }, 2000)
      } catch (err) {
        setTimeout(() => {
          setRobotMessage("Could not check violations. Please try again later!")
          setRobotMessageType("error")
          setRobotIsChecking(false)
          setTimeout(() => {
            setShowRobotMessage(false)
          }, 5000)
        }, 1000)
      }
    },
    [checkViolations, firstViolatedPlate],
  )

  // Manual check violations (when user clicks robot)
  const handleRobotClick = useCallback(() => {
    if (vehicles.length > 0 && !robotIsChecking) {
      checkAllVehicleViolations(vehicles)
    }
  }, [vehicles, robotIsChecking, checkAllVehicleViolations])

  // Scroll to a specific vehicle card
  const scrollToVehicle = useCallback((licensePlate: string) => {
    const element = document.getElementById(`vehicle-${licensePlate}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
      setShowRobotMessage(false) // Hide message after scrolling
    }
  }, [])

  useEffect(() => {
    loadVehicles()
  }, [loadVehicles])

  const getRobotIcon = () => {
    if (robotIsChecking) {
      return <Loader2 className="text-white animate-spin" size={20} />
    }
    switch (robotMessageType) {
      case "success":
        return <CheckCircle className="text-white" size={20} />
      case "warning":
        return <AlertTriangle className="text-white" size={20} />
      case "error":
        return <XCircle className="text-white" size={20} />
      case "info":
      default:
        return <Bot className="text-white" size={20} />
    }
  }

  const getRobotColorClass = () => {
    switch (robotMessageType) {
      case "success":
        return "bg-emerald-700"
      case "warning":
        return "bg-amber-700"
      case "error":
        return "bg-rose-700"
      case "info":
      default:
        return "bg-blue-700"
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-violet-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full absolute top-0 left-0 animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Car className="text-violet-500" size={20} />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-rose-200 p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-r from-rose-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="text-white" size={24} />
          </div>
          <p className="text-rose-600 text-lg font-medium">{error}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 flex items-center space-x-2 mx-auto px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <ArrowLeft size={18} />
              <span>Back to Profile</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 p-4 sm:p-6 relative">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 sm:mb-6 flex items-center space-x-3 px-4 py-2 sm:px-6 sm:py-3 bg-white/80 backdrop-blur-xl text-slate-700 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/50 hover:scale-105 active:scale-95 hover:-translate-x-1"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Profile</span>
        </button>
      )}

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6 sm:p-8 mb-6 sm:mb-8 relative">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
              <Car className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-1 sm:mb-2">
                My Vehicles Dashboard
              </h1>
              <p className="text-slate-600 flex items-center space-x-2 text-base sm:text-lg">
                <span>Manage your registered vehicles</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4 sm:space-x-6">
            {/* Robot Character Button */}
            <button
              onClick={handleRobotClick}
              disabled={robotIsChecking}
              className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-lg transition-all duration-300 ${robotIsChecking ? "bg-blue-400 animate-pulse cursor-wait" : "bg-blue-500 hover:bg-blue-600 hover:scale-110 cursor-pointer"}`}
              title="Click to check vehicle violations"
            >
              <Bot className="text-white" size={28} />
              {/* Removed the Loader2 from here */}
            </button>

            {/* Vehicle Count Display */}
            <div className="flex items-center space-x-3 sm:space-x-4 bg-gradient-to-r from-violet-100 to-purple-100 px-6 py-3 sm:px-8 sm:py-4 rounded-2xl border border-violet-200 shadow-lg">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-violet-400 to-purple-500 rounded-full animate-pulse"></div>
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                {filteredVehicles.length} Vehicles
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-5 sm:p-6 mb-6 sm:mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          {" "}
          {/* Grouping buttons */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-3 px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Filter size={20} />
            <span className="font-medium text-lg">Filters & Search</span>
            <ChevronDown
              size={20}
              className={`transform transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`}
            />
          </button>
          {/* View Mode Toggle Button - Moved here */}
          <button
            onClick={() => setIsCompactView(!isCompactView)}
            className="flex items-center space-x-2 px-4 py-2 sm:px-6 sm:py-3 bg-white/80 backdrop-blur-xl text-slate-700 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/50 hover:scale-105 active:scale-95"
          >
            {isCompactView ? <LayoutGrid size={20} /> : <List size={20} />}
            <span className="font-medium">{isCompactView ? "Detailed View" : "Compact View"}</span>
          </button>
          {/* New: Add New Vehicle Button */}
          <button
            onClick={() => navigate("/vehicles/add")}
            className="flex items-center space-x-2 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <PlusCircle size={20} />
            <span className="font-medium">Add New Vehicle</span>
          </button>
        </div>
        {(searchTerm || filterBrand) && (
          <button
            onClick={() => {
              setSearchTerm("")
              setFilterBrand("")
            }}
            className="flex items-center space-x-2 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <X size={18} />
            <span className="font-medium">Clear All Filters</span>
          </button>
        )}
        <div
          className={`overflow-hidden transition-all duration-400 ease-in-out ${showFilters ? "max-h-96 opacity-100 mt-6 pt-4 border-t border-gradient-to-r from-violet-200 to-purple-200" : "max-h-0 opacity-0"}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3 sm:mb-4">🔍 Search Vehicle</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-violet-400" size={20} />
                <input
                  type="text"
                  placeholder="Enter license plate or vehicle name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 sm:py-4 border-2 border-violet-200 rounded-2xl focus:ring-4 focus:ring-violet-200 focus:border-violet-400 transition-all duration-300 shadow-lg bg-white/90 backdrop-blur-sm text-base sm:text-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3 sm:mb-4">🚗 Brand Filter</label>
              <select
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                className="w-full px-4 py-3 sm:py-4 border-2 border-violet-200 rounded-2xl focus:ring-4 focus:ring-violet-200 focus:border-violet-400 transition-all duration-300 shadow-lg bg-white/90 backdrop-blur-sm text-base sm:text-lg"
              >
                <option value="">All Brands</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicles Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-violet-500" size={48} />
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-slate-500 text-center text-xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 sm:p-16 border border-white/50">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-r from-slate-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 animate-pulse">
            <Search className="text-slate-400" size={40} />
          </div>
          <p className="font-bold text-xl sm:text-2xl mb-2">No vehicles found</p>
          <p className="text-slate-400 text-base sm:text-lg">Try adjusting your search criteria or add some vehicles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredVehicles.map((vehicle, index) => (
            <div
              key={vehicle.id}
              id={`vehicle-${vehicle.licensePlate}`} // Add ID for scrolling
              className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/50 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 relative overflow-hidden cursor-pointer"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => navigate(`/violations/history/${vehicle.licensePlate}`)} // Navigate on click
            >
              {/* Card Background Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-indigo-500/5 rounded-3xl" />

              <div className="relative z-10 flex flex-col" style={{ minHeight: isCompactView ? "180px" : "320px" }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
                    {vehicle.name || `Vehicle #${vehicle.id}`}
                  </h3>
                  <div className="inline-flex items-center px-3 py-1 sm:px-4 sm:py-2 rounded-2xl text-xs sm:text-sm font-bold border-2 bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 text-emerald-700 shadow-lg">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-2 sm:mr-3 bg-gradient-to-r from-emerald-400 to-green-500 animate-pulse" />
                    Active
                  </div>
                </div>
                <div className="space-y-4 flex-grow">
                  <div className="flex items-center space-x-4 group">
                    <div className="p-2 sm:p-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-xl shadow-lg group-hover:scale-105 transition-all duration-300">
                      <Car size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs sm:text-sm text-slate-500 font-medium">License Plate</span>
                      <p className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors text-base sm:text-lg">
                        {vehicle.licensePlate}
                      </p>
                      {violations[vehicle.licensePlate] && violations[vehicle.licensePlate].length > 0 && (
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-red-600 font-medium">
                            {violations[vehicle.licensePlate].length} violations
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 group">
                    <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-xl shadow-lg group-hover:scale-105 transition-all duration-300">
                      <Car size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs sm:text-sm text-slate-500 font-medium">Brand</span>
                      <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-base sm:text-lg">
                        {vehicle.brand}
                      </p>
                    </div>
                  </div>
                  {/* Conditionally render Color and detailed Violations Summary */}
                  {!isCompactView && (
                    <>
                      <div className="flex items-center space-x-4 group">
                        <div className="p-2 sm:p-3 bg-gradient-to-r from-rose-400 to-pink-500 rounded-xl shadow-lg group-hover:scale-105 transition-all duration-300">
                          <Palette size={18} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs sm:text-sm text-slate-500 font-medium">Color</span>
                          <p className="font-bold text-slate-800 group-hover:text-rose-600 transition-colors text-base sm:text-lg">
                            {vehicle.color}
                          </p>
                        </div>
                      </div>
                      {violations[vehicle.licensePlate] && violations[vehicle.licensePlate].length > 0 && (
                        <div className="border-t border-slate-200 pt-4 mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-red-600">⚠️ Recent Violations</span>
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                              {violations[vehicle.licensePlate].length} issues
                            </span>
                          </div>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {violations[vehicle.licensePlate].slice(0, 3).map((violation, vIndex) => (
                              <div key={vIndex} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-red-700">
                                    {violation.violationDetails[0]?.violationType?.typeName || "Traffic Violation"}
                                  </span>
                                  <span className="text-xs text-red-500">
                                    {new Date(violation.createdAt).toLocaleDateString("en-US")}
                                  </span>
                                </div>
                                {violation.violationDetails[0]?.location && (
                                  <div className="text-xs text-red-600 mt-1">
                                    📍 {violation.violationDetails[0].location}
                                  </div>
                                )}
                              </div>
                            ))}
                            {violations[vehicle.licensePlate].length > 3 && (
                              <div className="text-center text-xs text-slate-500 pt-2">
                                +{violations[vehicle.licensePlate].length - 3} more violations
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Robot Speech Bubble - Fixed positioning */}
      {showRobotMessage && (
        <div
          className={`fixed bottom-6 right-6 w-72 sm:w-80 ${getRobotColorClass()} rounded-xl shadow-2xl p-4 border border-white/50 z-50 transition-all duration-300 ease-out`}
          style={{ animation: "fadeInUp 0.5s ease-out" }}
        >
          <div className="flex items-start space-x-3">
            <div
              className={`w-10 h-10 ${getRobotColorClass()} rounded-lg flex items-center justify-center flex-shrink-0 shadow-md`}
            >
              {getRobotIcon()}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-bold text-white">AI Assistant</span>
                {robotIsChecking && <Loader2 className="animate-spin text-white" size={16} />}
              </div>
              <p className="text-sm font-medium text-white leading-relaxed">{robotMessage}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {robotMessageType === "warning" && firstViolatedPlate && (
                  <button
                    onClick={() => scrollToVehicle(firstViolatedPlate)}
                    className="px-3 py-1 bg-white/20 text-white text-xs rounded-md hover:bg-white/30 transition-colors"
                  >
                    View Details
                  </button>
                )}
                {/* Removed Maintenance Check and Generate Report buttons */}
              </div>
            </div>
            <button
              onClick={() => setShowRobotMessage(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  )
}

export default VehicleCustomerList
