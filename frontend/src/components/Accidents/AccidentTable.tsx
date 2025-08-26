"use client"
import type React from "react"
import { useEffect, useState, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { toast } from "react-toastify"
import {
  Eye,
  Trash2,
  Camera,
  MapPin,
  Clock,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Calendar,
  Sparkles,
  Target,
  Activity,
  Globe,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react"
import { format } from "date-fns"
import ExportAccidentPDF from "../../components/Accidents/export-accident-pdf"
import BounceLoadingComponent from "../../components/Layout/Loading"
import { AlertDialog } from "../../Pages/Violations/AlertDialog"
import GenericTable, { type TableColumn, type FilterConfig } from "../../components/Table/GenericTable"
import { API_URL_BE } from "../../components/Link/LinkAPI"

// Types
interface AccidentType {
  id: number
  cameraId: number
  cameraName: string
  cameraLocation: string
  location: string
  status: string
  accidentTime: string
}

// Main AccidentTable Component
export default function AccidentTable() {
  const [accidents, setAccidents] = useState<AccidentType[]>([])
  const [statusOptions, setStatusOptions] = useState<{ value: string; label: string }[]>([])
  const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([])
  const [cameraOptions, setCameraOptions] = useState<{ value: string; label: string }[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "",
    cameraId: "",
    location: "",
  })
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10) // Fixed page size since GenericTable doesn't support pageSizeOptions
  const navigate = useNavigate()

  // Authorization header
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const authHeader = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }

  // Fetch Accident Data
  const fetchAccidentData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_URL_BE}api/accident`, authHeader)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data: AccidentType[] = await res.json()

      setAccidents(data)

      // Set filter options
      const uniqueStatuses = Array.from(new Set(data.map((acc) => acc.status)))
      setStatusOptions(uniqueStatuses.map((status) => ({ value: status, label: status })))

      const uniqueLocations = Array.from(new Set(data.map((acc) => acc.location)))
      setLocationOptions(uniqueLocations.map((loc) => ({ value: loc, label: loc })))

      const uniqueCameras = new Map<number, string>()
      data.forEach((acc) => {
        if (acc.cameraId && acc.cameraName && !uniqueCameras.has(acc.cameraId)) {
          uniqueCameras.set(acc.cameraId, acc.cameraName)
        }
      })
      const cameraOptionsArray = Array.from(uniqueCameras.entries()).map(([id, name]) => ({
        value: id.toString(),
        label: name,
      }))
      setCameraOptions(cameraOptionsArray)

      setTimeout(() => {
        setLoading(false)
      }, 2000)
    } catch (err) {
      console.error("Failed to load accidents:", err)
      setError("Unable to load accident list. Please try again.")
      setTimeout(() => {
        setLoading(false)
      }, 2000)
    }
  }, [])

  useEffect(() => {
    fetchAccidentData()
  }, [fetchAccidentData])

  // Apply Filters
  const filteredAccidents = useMemo(() => {
    let filtered = accidents
    if (filterValues.status) {
      filtered = filtered.filter((acc) => acc.status === filterValues.status)
    }
    if (filterValues.cameraId) {
      filtered = filtered.filter((acc) => acc.cameraId === Number(filterValues.cameraId))
    }
    if (filterValues.location) {
      filtered = filtered.filter((acc) => acc.location === filterValues.location)
    }
    return filtered
  }, [accidents, filterValues])

  // Paginated data
  const paginatedAccidents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredAccidents.slice(startIndex, endIndex)
  }, [filteredAccidents, currentPage, pageSize])

  const totalPages = useMemo(() => Math.ceil(filteredAccidents.length / pageSize), [filteredAccidents.length, pageSize])

  // Statistics
  const stats = useMemo(() => {
    const totalAccidents = filteredAccidents.length
    const today = new Date()
    const todayAccidents = filteredAccidents.filter((acc) => {
      const accidentDate = new Date(acc.accidentTime)
      return accidentDate.toDateString() === today.toDateString()
    }).length

    const locationStats = Array.from(
      filteredAccidents.reduce((acc, accident) => {
        acc.set(accident.location, (acc.get(accident.location) || 0) + 1)
        return acc
      }, new Map<string, number>()),
    )
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)

    const cameraInvolvedCount = new Set(filteredAccidents.map((acc) => acc.cameraId)).size
    const prevWeekAccidents = totalAccidents - Math.floor(Math.random() * 20)
    const trendPercentage =
      totalAccidents > 0 && prevWeekAccidents > 0 ? ((totalAccidents - prevWeekAccidents) / prevWeekAccidents) * 100 : 0

    return { totalAccidents, todayAccidents, locationStats, cameraInvolvedCount, trendPercentage }
  }, [filteredAccidents])

  // Get status color
  const getStatusColor = (status: string | null) => {
    const statusMap: { [key: string]: { bg: string; text: string; icon: React.ReactNode } } = {
      Requested: {
        bg: "bg-yellow-100",
        text: "text-yellow-700",
        icon: <AlertTriangle className="text-yellow-500" size={14} />,
      },
      Processed: {
        bg: "bg-green-100",
        text: "text-green-700",
        icon: <CheckCircle2 className="text-green-500" size={14} />,
      },
      Approved: {
        bg: "bg-green-100",
        text: "text-green-700",
        icon: <CheckCircle2 className="text-green-500" size={14} />,
      },
      rejected: {
        bg: "bg-red-100",
        text: "text-red-700",
        icon: <XCircle className="text-red-500" size={14} />,
      },
      null: {
        bg: "bg-gray-100",
        text: "text-gray-500",
        icon: <div className="w-2 h-2 bg-gray-400 rounded-full" />,
      },
    }
    return (
      statusMap[status || "null"] || {
        bg: "bg-gray-100",
        text: "text-gray-500",
        icon: <div className="w-2 h-2 bg-gray-400 rounded-full" />,
      }
    )
  }

  // Handle filter change
  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }, [])

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilterValues({ status: "", cameraId: "", location: "" })
    setCurrentPage(1)
  }, [])

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    },
    [totalPages],
  )

  // Handle delete
  const handleDelete = useCallback(
    async (id: number) => {
      try {
        setIsDeleting(true)
        const res = await fetch(`${API_URL_BE}api/accident/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (res.ok) {
          setAccidents((prev) => prev.filter((acc) => acc.id !== id))
          setOpenDialog(false)
          toast.success("🗑️ Accident deleted successfully!", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          })

          // Adjust pagination if needed
          const newTotal = filteredAccidents.length - 1
          const newTotalPages = Math.ceil(newTotal / pageSize)
          if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(newTotalPages)
          } else if (paginatedAccidents.length === 1 && currentPage > 1) {
            setCurrentPage(currentPage - 1)
          }
        } else {
          const errorData = await res.json()
          throw new Error(errorData.message || "Failed to delete accident.")
        }
      } catch (error: any) {
        console.error(error)
        toast.error(`❌ ${error.message || "An error occurred while deleting the accident."}`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
      } finally {
        setIsDeleting(false)
      }
    },
    [filteredAccidents.length, currentPage, pageSize, paginatedAccidents],
  )

  // Handle process
  const handleProcess = useCallback(
    async (id: number) => {
      setIsProcessing(true)
      try {
        const res = await fetch(`${API_URL_BE}api/accident/${id}/process`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (res.ok) {
          toast.success("✅ Accident processed successfully!", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          })
          fetchAccidentData()
        } else {
          const errorData = await res.json()
          throw new Error(errorData.message || "Failed to process accident.")
        }
      } catch (error: any) {
        console.error(error)
        toast.error(`❌ ${error.message || "An error occurred while processing the accident."}`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
      } finally {
        setIsProcessing(false)
      }
    },
    [fetchAccidentData],
  )

  // Handle reject
  const handleReject = useCallback(
    async (id: number) => {
      setIsRejecting(true)
      try {
        const res = await fetch(`${API_URL_BE}api/accident/${id}/reject`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (res.ok) {
          toast.success("🚫 Accident rejected successfully!", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          })
          fetchAccidentData()
        } else {
          const errorData = await res.json()
          throw new Error(errorData.message || "Failed to reject accident.")
        }
      } catch (error: any) {
        console.error(error)
        toast.error(`❌ ${error.message || "An error occurred while rejecting the accident."}`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
      } finally {
        setIsRejecting(false)
      }
    },
    [fetchAccidentData],
  )

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await fetchAccidentData()
  }, [fetchAccidentData])

  // Handle retry
  const handleRetry = useCallback(() => {
    fetchAccidentData()
  }, [fetchAccidentData])

  // Define table columns
  const columns: TableColumn<AccidentType>[] = useMemo(
    () => [
      {
        key: "cameraId",
        title: "Camera",
        width: "20%",
        render: (_, record: AccidentType, index: number) => (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="relative group max-w-full overflow-hidden"
          >
            {record.cameraName && record.cameraLocation ? (
              <div className="group max-w-full">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="p-1 bg-blue-100 rounded-lg flex-shrink-0">
                    <Camera size={14} className="text-blue-600" />
                  </div>
                  <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 truncate">
                    {record.cameraName}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded-lg truncate">
                  <MapPin size={12} className="flex-shrink-0" />
                  <span className="truncate">{record.cameraLocation}</span>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 italic bg-gray-50 px-3 py-2 rounded-lg truncate">Unidentified</div>
            )}
          </motion.div>
        ),
      },
      {
        key: "location",
        title: "Location",
        width: "20%",
        render: (value: string) => (
          <div className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-300 bg-gradient-to-r from-orange-500/10 to-red-500/10 text-orange-700 border-orange-200 shadow-sm hover:shadow-md truncate max-w-full">
            <MapPin size={14} className="mr-2 flex-shrink-0" />
            <span className="truncate">{value}</span>
          </div>
        ),
      },
      {
        key: "accidentTime",
        title: "Time",
        width: "20%",
        render: (value: string) => {
          try {
            const date = new Date(value)
            const isToday = date.toDateString() === new Date().toDateString()
            return (
              <div className="space-y-2 max-w-full">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-purple-100 rounded-lg flex-shrink-0">
                    <Clock size={14} className="text-purple-600" />
                  </div>
                  <span className="font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg truncate">
                    {format(date, "HH:mm:ss")}
                  </span>
                </div>
                <div
                  className={`text-sm flex items-center space-x-2 ${
                    isToday ? "text-green-600 font-bold" : "text-gray-500"
                  } truncate`}
                >
                  <Calendar size={12} className="flex-shrink-0" />
                  <span className="truncate">{format(date, "dd/MM/yyyy")}</span>
                  {isToday && (
                    <span className="ml-2 text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full animate-pulse truncate">
                      Today
                    </span>
                  )}
                </div>
              </div>
            )
          } catch {
            return <span className="text-gray-400 italic truncate">N/A</span>
          }
        },
      },
      {
        key: "status",
        title: "Status",
        width: "15%",
        render: (value: string) => {
          const { bg, text, icon } = getStatusColor(value)
          return (
            <div className={`inline-flex items-center px-3 py-1 rounded-lg ${bg} ${text} font-medium truncate`}>
              {icon}
              <span className="ml-2 capitalize truncate">{value || "Pending"}</span>
            </div>
          )
        },
      },
      {
        key: "actions",
        title: "Actions",
        width: "15%",
        render: (_, record: AccidentType) => {
          if (record.status === "Requested") {
            return (
              <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleProcess(record.id)}
                  disabled={isProcessing}
                  className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isProcessing ? "Processing..." : "Process"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleReject(record.id)}
                  disabled={isRejecting}
                  className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isRejecting ? "Rejecting..." : "Reject"}
                </motion.button>
              </div>
            )
          } else {
            return (
              <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate(`/accidents/${record.id}`)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200 rounded-lg p-2"
                  title="View Details"
                  aria-label={`View details for accident ${record.id}`}
                >
                  <Eye size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setSelectedId(record.id)
                    setOpenDialog(true)
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 rounded-lg p-2"
                  title="Delete"
                  aria-label={`Delete accident ${record.id}`}
                >
                  <Trash2 size={16} />
                </motion.button>
              </div>
            )
          }
        },
      },
    ],
    [isProcessing, isRejecting, navigate, handleProcess, handleReject],
  )

  // Define filters
  const filters: FilterConfig[] = useMemo(
    () => [
      {
        key: "cameraId",
        label: "Camera Name",
        type: "select",
        options: cameraOptions,
        placeholder: "Select camera...",
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: statusOptions,
      },
      {
        key: "location",
        label: "Location",
        type: "select",
        options: locationOptions,
      },
    ],
    [statusOptions, cameraOptions, locationOptions],
  )

  // Loading state
  if (loading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Enhanced Statistics Cards - Show skeleton or keep visible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <motion.div
              className="bg-gradient-to-br from-white/95 to-blue-50/95 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-blue-200/50 hover:border-blue-300/50 transform hover:-translate-y-1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Target size={16} className="text-blue-500" />
                    <p className="text-sm font-medium text-gray-600">Total Accidents</p>
                  </div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl shadow-lg">
                  <AlertTriangle className="text-white" size={24} />
                </div>
              </div>
            </motion.div>

            <motion.div
              className="bg-gradient-to-br from-white/95 to-green-50/95 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-green-200/50 hover:border-green-300/50 transform hover:-translate-y-1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock size={16} className="text-green-500" />
                    <p className="text-sm font-medium text-gray-600">Today</p>
                  </div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl shadow-lg">
                  <Activity className="text-white" size={24} />
                </div>
              </div>
            </motion.div>

            <motion.div
              className="bg-gradient-to-br from-white/95 to-orange-50/95 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-orange-200/50 hover:border-orange-300/50 transform hover:-translate-y-1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 size={16} className="text-orange-500" />
                    <p className="text-sm font-medium text-gray-600">Most Common Location</p>
                  </div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-xl shadow-lg">
                  <TrendingUp className="text-white" size={24} />
                </div>
              </div>
            </motion.div>

            <motion.div
              className="bg-gradient-to-br from-white/95 to-purple-50/95 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-purple-200/50 hover:border-purple-300/50 transform hover:-translate-y-1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Camera size={16} className="text-purple-500" />
                    <p className="text-sm font-medium text-gray-600">Active Cameras</p>
                  </div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl shadow-lg">
                  <Globe className="text-white" size={24} />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Controls Section */}
          <motion.div
            className="bg-gradient-to-r from-white/95 to-slate-50/95 rounded-2xl shadow-xl border border-slate-200/50 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-blue-50/80 px-4 py-2 rounded-xl">
                    <Sparkles size={16} className="text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">Loading...</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="relative w-full overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="bg-[rgba(255,255,255,0.95)] rounded-[16px] shadow-[0_10px_15px_rgba(0,0,0,0.1)] border border-[rgba(203,213,225,0.5)] backdrop-blur-[10px] w-full">
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <BounceLoadingComponent size="sm" />
                    <p className="text-lg text-gray-600 mt-4">Loading accidents...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* <Sidebar defaultActiveItem="accidents" /> */}
        <div className="flex flex-col flex-grow">
          {/* <Header title="Traffic Accident List" /> */}
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                aria-label="Retry loading data"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="p-4 sm:p-6 space-y-6">
        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <motion.div
            className="bg-gradient-to-br from-white/95 to-blue-50/95 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-blue-200/50 hover:border-blue-300/50 transform hover:-translate-y-1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Target size={16} className="text-blue-500" />
                  <p className="text-sm font-medium text-gray-600">Total Accidents</p>
                </div>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {stats.totalAccidents}
                </p>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl shadow-lg">
                <AlertTriangle className="text-white" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-white/95 to-green-50/95 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-green-200/50 hover:border-green-300/50 transform hover:-translate-y-1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Clock size={16} className="text-green-500" />
                  <p className="text-sm font-medium text-gray-600">Today</p>
                </div>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {stats.todayAccidents}
                </p>
                <div className="flex items-center space-x-1 mt-2">
                  <span className="text-sm text-gray-500">
                    {stats.totalAccidents > 0 ? ((stats.todayAccidents / stats.totalAccidents) * 100).toFixed(1) : 0}%
                    of total
                  </span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl shadow-lg">
                <Activity className="text-white" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-white/95 to-orange-50/95 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-orange-200/50 hover:border-orange-300/50 transform hover:-translate-y-1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 size={16} className="text-orange-500" />
                  <p className="text-sm font-medium text-gray-600">Most Common Location</p>
                </div>
                <p className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  {stats.locationStats[0]?.location || "N/A"}
                </p>
                <div className="flex items-center space-x-1 mt-2">
                  <span className="text-sm text-gray-500">{stats.locationStats[0]?.count || 0} cases</span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-xl shadow-lg">
                <TrendingUp className="text-white" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-white/95 to-purple-50/95 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-purple-200/50 hover:border-purple-300/50 transform hover:-translate-y-1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Camera size={16} className="text-purple-500" />
                  <p className="text-sm font-medium text-gray-600">Active Cameras</p>
                </div>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {stats.cameraInvolvedCount}
                </p>
                <div className="flex items-center space-x-1 mt-2">
                  <span className="text-sm text-gray-500">Monitoring active</span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl shadow-lg">
                <Globe className="text-white" size={24} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Controls Section */}
        <motion.div
          className="bg-gradient-to-r from-white/95 to-slate-50/95 rounded-2xl shadow-xl border border-slate-200/50 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <ExportAccidentPDF accidents={filteredAccidents} />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                  aria-label="Refresh accident list"
                >
                  <RefreshCw size={16} />
                  <span>Refresh</span>
                </motion.button>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-blue-50/80 px-4 py-2 rounded-xl">
                  <Sparkles size={16} className="text-blue-500" />
                  <span className="text-sm font-medium text-blue-700">{filteredAccidents.length} results</span>
                </div>
                {(filterValues.status || filterValues.cameraId || filterValues.location) && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Filtered from {accidents.length} total</span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={resetFilters}
                      className="flex items-center space-x-1 px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200"
                      aria-label="Clear all filters"
                    >
                      <X size={14} />
                      <span className="text-sm">Clear</span>
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Data Table with Responsive Wrapper */}
        <div className="relative w-full overflow-x-auto">
          <div className="min-w-[640px]">
            <GenericTable
              data={accidents}
              filteredData={paginatedAccidents}
              columns={columns}
              rowKey="id"
              actions={[]}
              filters={filters}
              filterValues={filterValues}
              onFilterChange={handleFilterChange}
              onResetFilters={resetFilters}
              pagination={{
                enabled: true,
                currentPage,
                totalPages,
                pageSize,
                totalItems: filteredAccidents.length,
                onPageChange: handlePageChange,
              }}
              onRowClick={(accident: AccidentType) => navigate(`/accidents/${accident.id}`)}
              emptyMessage="🚫 No accidents found. Try adjusting your search criteria."
              className="bg-[rgba(255,255,255,0.95)] rounded-[16px] shadow-[0_10px_15px_rgba(0,0,0,0.1)] border border-[rgba(203,213,225,0.5)] backdrop-blur-[10px] w-full table-auto"
            />
          </div>
        </div>
      </div>

      <AlertDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onConfirm={() => {
          if (selectedId !== null) handleDelete(selectedId)
        }}
        title="⚠️ Confirm Accident Deletion"
        description="Are you sure you want to delete this accident? This action cannot be undone and will permanently delete all related data."
      />
    </div>
  )
}
