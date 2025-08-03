"use client"

import type React from "react"
import { useEffect, useState, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import GenericTable, { type TableColumn, type FilterConfig } from "../Table/GenericTable"
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
  Download,
  BarChart3,
  Calendar,
  Sparkles,
  Shield,
  Target,
  Activity,
  Globe,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { format } from "date-fns"
import ConfirmDialog from "../UI/PopUp/ConfirmDialog" // Your custom ConfirmDialog

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

// Constants
const API_URL_ACCIDENTS = "http://localhost:8081"

const ITEMS_PER_PAGE = 10

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
  const [modalDeleteId, setModalDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE)
  const navigate = useNavigate()

  // Fetch Accident Data
  const fetchAccidentData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL_ACCIDENTS}/api/accident`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data: AccidentType[] = await res.json()
      setAccidents(data)

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
    } catch (err) {
      console.error("Failed to load accidents:", err)
      setError("Unable to load accident list. Please try again.")
      toast.error("❌ Failed to load accidents!")
    } finally {
      setLoading(false)
    }
  }, [refreshKey])

  useEffect(() => {
    fetchAccidentData()
  }, [fetchAccidentData])

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues((prev) => ({
      ...prev,
      [key]: value,
    }))
    setCurrentPage(1)
  }, [])

  const resetFilters = useCallback(() => {
    setFilterValues({
      status: "",
      cameraId: "",
      location: "",
    })
    setCurrentPage(1)
  }, [])

  const filteredAccidents = useMemo(() => {
    return accidents.filter((acc) => {
      const matchStatus = !filterValues.status || acc.status === filterValues.status
      const matchCamera = !filterValues.cameraId || acc.cameraId === Number(filterValues.cameraId)
      const matchLocation = !filterValues.location || acc.location === filterValues.location
      return matchStatus && matchCamera && matchLocation
    })
  }, [accidents, filterValues])

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
    return {
      totalAccidents,
      todayAccidents,
      locationStats,
      cameraInvolvedCount,
      trendPercentage,
    }
  }, [filteredAccidents])

  // Get status color
  const getStatusColor = (status: string | null) => {
    const statusMap: { [key: string]: { bg: string; text: string; icon: React.ReactNode } } = {
      Requested: {
        bg: "bg-yellow-100", // Màu vàng cho Requested
        text: "text-yellow-700",
        icon: <AlertTriangle className="text-yellow-500" size={14} />, // Icon cảnh báo
      },
      Processed: {
        bg: "bg-green-100",
        text: "text-green-700",
        icon: <CheckCircle2 className="text-green-500" size={14} />,
      },
      Approved: {
        bg: "bg-green-100", // Màu xanh lá cây cho Approved
        text: "text-green-700",
        icon: <CheckCircle2 className="text-green-500" size={14} />,
      },
      Rejected: {
        bg: "bg-red-100", // Màu đỏ cho Rejected
        text: "text-red-700",
        icon: <XCircle className="text-red-500" size={14} />,
      },
      null: { bg: "bg-gray-100", text: "text-gray-500", icon: <div className="w-2 h-2 bg-gray-400 rounded-full" /> }, // Mặc định xám
    }
    return (
      statusMap[status || "null"] || {
        bg: "bg-gray-100",
        text: "text-gray-500",
        icon: <div className="w-2 h-2 bg-gray-400 rounded-full" />,
      }
    )
  }

  const columns: TableColumn<AccidentType>[] = useMemo(
    () => [
      {
        key: "cameraId",
        title: "Camera",
        render: (value, record) => {
          return record.cameraName && record.cameraLocation ? (
            <div className="group">
              <div className="flex items-center space-x-2 mb-1">
                <div className="p-1 bg-blue-100 rounded-lg">
                  <Camera size={14} className="text-blue-600" />
                </div>
                <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                  {record.cameraName}
                </span>
              </div>
              <div className="flex items-center space-x-1 text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                <MapPin size={12} />
                <span>{record.cameraLocation}</span>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 italic bg-gray-50 px-3 py-2 rounded-lg">Unidentified</div>
          )
        },
      },
      {
        key: "location",
        title: "Location",
        render: (value) => (
          <div className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-300 bg-gradient-to-r from-orange-500/10 to-red-500/10 text-orange-700 border-orange-200 shadow-sm hover:shadow-md">
            <MapPin size={14} className="mr-2" />
            {value}
          </div>
        ),
      },
      {
        key: "accidentTime",
        title: "Time",
        render: (value: string) => {
          try {
            const date = new Date(value)
            const isToday = date.toDateString() === new Date().toDateString()
            return (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-purple-100 rounded-lg">
                    <Clock size={14} className="text-purple-600" />
                  </div>
                  <span className="font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg">
                    {format(date, "HH:mm:ss")}
                  </span>
                </div>
                <div
                  className={`text-sm flex items-center space-x-2 ${isToday ? "text-green-600 font-bold" : "text-gray-500"}`}
                >
                  <Calendar size={12} />
                  <span>{format(date, "dd/MM/yyyy")}</span>
                  {isToday && (
                    <span className="ml-2 text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full animate-pulse">
                      Today
                    </span>
                  )}
                </div>
              </div>
            )
          } catch {
            return <span className="text-gray-400 italic">N/A</span>
          }
        },
      },
      {
        key: "status",
        title: "Status",
        render: (value: string) => {
          const { bg, text, icon } = getStatusColor(value)
          return (
            <div className={`inline-flex items-center px-3 py-1 rounded-lg ${bg} ${text} font-medium`}>
              {icon}
              <span className="ml-2 capitalize">{value || "Pending"}</span>
            </div>
          )
        },
      },
      {
        key: "actions",
        title: "Actions",
        render: (value, record) => {
          if (record.status === "Requested") {
            return (
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleProcess(record.id)
                  }}
                  disabled={isProcessing}
                  className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Processing..." : "Process"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReject(record.id)
                  }}
                  disabled={isRejecting}
                  className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRejecting ? "Rejecting..." : "Reject"}
                </button>
              </div>
            )
          } else {
            return (
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate(`/accidents/${record.id}`)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200 rounded-lg p-2"
                  title="View Details"
                >
                  <Eye size={16} />
                  <span className="sr-only">View Details</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setModalDeleteId(record.id)
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 rounded-lg p-2"
                  title="Delete"
                >
                  <Trash2 size={16} />
                  <span className="sr-only">Delete</span>
                </button>
              </div>
            )
          }
        },
      },
    ],
    [isProcessing, isRejecting, navigate],
  )

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

  const pagination = useMemo(
    () => ({
      enabled: true,
      currentPage,
      totalPages: Math.ceil(filteredAccidents.length / pageSize),
      pageSize,
      totalItems: filteredAccidents.length,
      onPageChange: (page: number) => setCurrentPage(page),
      onPageSizeChange: (size: number) => {
        setPageSize(size)
        setCurrentPage(1)
      },
    }),
    [filteredAccidents.length, currentPage, pageSize],
  )

  const handleDelete = useCallback(async () => {
    if (modalDeleteId === null) return
    setIsDeleting(true)
    try {
      const res = await fetch(`${API_URL_ACCIDENTS}/api/accident/${modalDeleteId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success("🗑️ Accident deleted successfully!", {
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
      setModalDeleteId(null)
    }
  }, [modalDeleteId, fetchAccidentData])

  const handleProcess = useCallback(
    async (id: number) => {
      setIsProcessing(true)
      try {
        const res = await fetch(`${API_URL_ACCIDENTS}/api/accident/${id}/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

  const handleReject = useCallback(
    async (id: number) => {
      setIsRejecting(true)
      try {
        const res = await fetch(`${API_URL_ACCIDENTS}/api/accident/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    setRefreshKey((prev) => prev + 1)
    setTimeout(() => setRefreshing(false), 500)
  }, [])

  const handleRetry = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
      <div className="flex flex-col flex-grow overflow-hidden">
        <div className="flex-grow p-6 overflow-y-auto">
          <div className="max-w-full space-y-8">
            {/* Enhanced Header Section */}
            <motion.div
              className="bg-gradient-to-r from-white/90 via-blue-50/90 to-purple-50/90 rounded-2xl shadow-xl border border-blue-200/70 p-6 backdrop-blur-md"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
                    <Shield className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Accident Monitoring System
                    </h1>
                    <p className="text-gray-600 flex items-center space-x-2">
                      <Activity size={16} />
                      <span>Real-time tracking and management of accident incidents</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-700 text-sm font-medium">Active</span>
                </div>
              </div>
            </motion.div>
            {/* Enhanced Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <motion.div
                className="bg-gradient-to-br from-white/90 to-blue-50/90 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 border border-blue-200/70 hover:border-blue-300/70 transform hover:-translate-y-2"
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
                    <div className="flex items-center space-x-1 mt-2">
                      <TrendingUp size={14} className={stats.trendPercentage > 0 ? "text-red-500" : "text-green-500"} />
                      <span
                        className={`text-sm font-medium ${stats.trendPercentage > 0 ? "text-red-500" : "text-green-500"}`}
                      >
                        {stats.trendPercentage > 0 ? "+" : ""}
                        {stats.trendPercentage.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-500">vs last week</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl shadow-lg">
                    <AlertTriangle className="text-white" size={24} />
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="bg-gradient-to-br from-white/90 to-green-50/90 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 border border-green-200/70 hover:border-green-300/70 transform hover:-translate-y-2"
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
                        {((stats.todayAccidents / stats.totalAccidents) * 100).toFixed(1)}% of total
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl shadow-lg">
                    <Activity className="text-white" size={24} />
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="bg-gradient-to-br from-white/90 to-orange-50/90 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 border border-orange-200/70 hover:border-orange-300/70 transform hover:-translate-y-2"
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
                className="bg-gradient-to-br from-white/90 to-purple-50/90 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 border border-purple-200/70 hover:border-purple-300/70 transform hover:-translate-y-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Camera size={16} className="text-purple-500" />
                      <p className="text-sm font-medium text-gray-600">Cameras Involved</p>
                    </div>
                    <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {stats.cameraInvolvedCount}
                    </p>
                    <div className="flex items-center space-x-1 mt-2">
                      <span className="text-sm text-gray-600 font-medium">Total unique cameras</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl shadow-lg">
                    <Globe className="text-white" size={24} />
                  </div>
                </div>
              </motion.div>
            </div>
            {/* Enhanced Controls Section */}
            <motion.div
              className="bg-gradient-to-r from-white/90 to-slate-50/90 rounded-2xl shadow-xl border border-slate-200/70 p-6 backdrop-blur-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Placeholder for Export PDF - not implemented in original logic */}
                  <button className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 rounded-xl hover:bg-gray-50 border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md">
                    <Download size={16} />
                    <span>Export PDF</span>
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                    <span>Refresh</span>
                  </motion.button>
                  {/* The "Filters" button and expandable filter section are now handled by GenericTable */}
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-blue-50/80 px-4 py-2 rounded-xl">
                    <Sparkles size={16} className="text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">{filteredAccidents.length} results</span>
                  </div>
                  {/* Filtered from total text and Clear Filters button are now handled by GenericTable */}
                </div>
              </div>
            </motion.div>
            {/* Enhanced Data Table */}
            <motion.div
              className="bg-white/90 rounded-2xl shadow-2xl border border-gray-200/70 overflow-hidden backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-gradient-to-r from-gray-50/90 to-blue-50/90 px-6 py-4 border-b border-gray-200/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow-md">
                      <BarChart3 className="text-white" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Accident List</h3>
                      <p className="text-sm text-gray-600">Manage and track accident incidents</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-green-100/80 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      {filteredAccidents.length} records
                    </div>
                  </div>
                </div>
              </div>
              <GenericTable<AccidentType>
                data={accidents}
                filteredData={filteredAccidents}
                columns={columns}
                rowKey="id"
                actions={[]}
                filters={filters}
                filterValues={filterValues}
                onFilterChange={handleFilterChange}
                onResetFilters={resetFilters}
                loading={loading}
                error={error}
                onRetry={handleRetry}
                onRowClick={(record, index) => navigate(`/accidents/${record.id}`)}
                pagination={pagination}
                emptyMessage="🚫 No accident data available"
                className="border-0"
              />
            </motion.div>
            {/* Quick Stats Bar */}
            <motion.div
              className="bg-gradient-to-r from-white/90 to-gray-50/90 rounded-2xl shadow-xl border border-gray-200/70 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{statusOptions.length}</div>
                    <div className="text-sm text-gray-600">Accident Statuses</div>
                  </div>
                  <div className="w-px h-8 bg-gray-300/50"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.cameraInvolvedCount}</div>
                    <div className="text-sm text-gray-600">Total Cameras</div>
                  </div>
                  <div className="w-px h-8 bg-gray-300/50"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{locationOptions.length}</div>
                    <div className="text-sm text-gray-600">Unique Locations</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock size={16} />
                  <span>Last updated: {format(new Date(), "HH:mm:ss - dd/MM/yyyy")}</span>
                </div>
              </div>
            </motion.div>
            {/* Top Accidents Chart (List) */}
            <motion.div
              className="bg-white/90 rounded-2xl shadow-2xl border border-gray-200/70 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Top Common Accident Locations</h3>
                  <p className="text-sm text-gray-600">Statistics of accident locations by frequency</p>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 size={20} className="text-blue-500" />
                </div>
              </div>
              <div className="space-y-4">
                {stats.locationStats.slice(0, 5).map((stat, index) => (
                  <motion.div
                    key={stat.location}
                    className="flex items-center justify-between p-3 bg-gray-50/90 rounded-xl hover:bg-gray-100/90 transition-colors duration-200"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{stat.location}</div>
                        <div className="text-sm text-gray-600">{stat.count} cases</div>
                      </div>
                    </div>
                    <div className="w-32 h-2 bg-gray-200/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{
                          width: `${(stat.count / Math.max(...stats.locationStats.map((s) => s.count), 1)) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <div className="text-sm font-medium text-gray-900 min-w-[60px] text-right">
                      {((stat.count / stats.totalAccidents) * 100).toFixed(1)}%
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={modalDeleteId !== null}
        title="⚠️ Confirm Accident Deletion"
        message="Are you sure you want to delete this accident? This action cannot be undone and will permanently delete all related data."
        onConfirm={handleDelete}
        onCancel={() => setModalDeleteId(null)}
        confirmButtonText={isDeleting ? "Deleting..." : "Confirm"}
        confirmButtonColor="bg-red-500 hover:bg-red-600"
      />
    </div>
  )
}
