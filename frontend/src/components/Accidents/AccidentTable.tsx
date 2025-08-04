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
  ChevronRight,
  ChevronLeft,
  Filter,
  AlertCircle,
  X,
} from "lucide-react"
import { format } from "date-fns"
import ExportAccidentPDF from "../../components/Accidents/export-accident-pdf" // Import the new component

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

// Generic interfaces for GenericTable
export interface TableColumn<T> {
  key: keyof T | string
  title: string
  render?: (value: any, record: T, index: number) => React.ReactNode
  width?: string
}
export interface TableAction<T> {
  key: string
  label: string
  icon?: React.ReactNode
  onClick: (record: T, index: number) => void
  className?: string
}
export interface FilterConfig {
  key: string
  label: string
  type: "text" | "select"
  options?: { value: string; label: string }[]
  placeholder?: string
}
export interface GenericTableProps<T> {
  data: T[]
  filteredData: T[]
  columns: TableColumn<T>[]
  rowKey: keyof T
  actions?: TableAction<T>[]
  filters?: FilterConfig[]
  filterValues?: Record<string, any>
  onFilterChange?: (key: string, value: any) => void
  onResetFilters?: () => void
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onRowClick?: (record: T, index: number) => void
  pagination?: {
    enabled: boolean
    currentPage: number
    totalPages: number
    pageSize: number
    totalItems: number
    onPageChange: (page: number) => void
    onPageSizeChange?: (pageSize: number) => void
  }
  className?: string
  emptyMessage?: string
}

// GenericTable Component
function GenericTable<T extends Record<string, any>>({
  data,
  filteredData,
  columns,
  rowKey,
  actions = [],
  filters = [],
  filterValues = {},
  onFilterChange,
  onResetFilters,
  loading = false,
  error = null,
  onRetry,
  onRowClick,
  pagination,
  className = "",
  emptyMessage = "No data found",
}: GenericTableProps<T>) {
  const [showFilters, setShowFilters] = useState(false)
  // Check if filters are active
  const hasActiveFilters = Object.values(filterValues).some(
    (value) => value !== "" && value !== null && value !== undefined,
  )
  // Get paginated data
  const displayData = pagination?.enabled ? data : filteredData
  // Calculate pagination info
  const startEntry = pagination?.enabled ? (pagination.currentPage - 1) * pagination.pageSize + 1 : 1
  const endEntry = pagination?.enabled
    ? Math.min(pagination.currentPage * pagination.pageSize, filteredData.length)
    : filteredData.length
  // Page size options
  const pageSizeOptions = [10, 25, 50, 100]
  // Generate page numbers for pagination
  const getPageNumbers = () => {
    if (!pagination) return []
    const { currentPage, totalPages } = pagination
    const pages = []
    const maxVisiblePages = 5
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      const half = Math.floor(maxVisiblePages / 2)
      let start = Math.max(currentPage - half, 1)
      const end = Math.min(start + maxVisiblePages - 1, totalPages)
      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(end - maxVisiblePages + 1, 1)
      }
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
    }
    return pages
  }
  // Helper function to get nested values
  const getNestedValue = (obj: any, path: string) => {
    return path.split(".").reduce((current, key) => current?.[key], obj)
  }
  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Filter Section */}
      {filters.length > 0 && (
        <>
          <div className="flex flex-wrap p-4 gap-2 border-b border-gray-200">
            <div
              className="border rounded-lg p-2 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={20} className="text-gray-600" />
            </div>
            {filters.map((filter) => (
              <div key={filter.key} className="border rounded-lg bg-gray-50 hover:bg-gray-100 flex-grow max-w-xs">
                {filter.type === "text" && (
                  <div className="flex items-center px-4 py-2">
                    <input
                      type="text"
                      placeholder={filter.placeholder || `Search ${filter.label.toLowerCase()}...`}
                      value={filterValues[filter.key] || ""}
                      onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                      className="bg-transparent outline-none text-gray-700 placeholder-gray-500 w-full"
                    />
                  </div>
                )}
                {filter.type === "select" && (
                  <select
                    value={filterValues[filter.key] || ""}
                    onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                    className="w-full px-4 py-2 bg-transparent outline-none text-gray-700"
                  >
                    <option value="">All {filter.label}</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
            {hasActiveFilters && onResetFilters && (
              <button
                className="flex items-center text-red-500 hover:text-red-600 px-3 py-2 transition-colors"
                onClick={onResetFilters}
              >
                <X size={16} className="mr-1" />
                Reset Filters
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <div className="p-4 border-b border-gray-200 flex flex-wrap gap-2">
              {filters.map((filter) => {
                const value = filterValues[filter.key]
                if (!value) return null
                return (
                  <span
                    key={filter.key}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {filter.label}: {String(value)}
                    <button onClick={() => onFilterChange?.(filter.key, "")} className="ml-2 hover:text-blue-600">
                      <X size={14} />
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </>
      )}
      {/* Table Header Info */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">
            Showing {startEntry} to {endEntry} of {filteredData.length} entries
            {filteredData.length !== data.length && (
              <span className="text-gray-500"> (filtered from {data.length} total entries)</span>
            )}
          </span>
        </div>
        {pagination?.enabled && pagination.onPageSizeChange && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-700">entries</span>
          </div>
        )}
      </div>
      {/* Table */}
      <div className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-3 text-gray-600">Loading...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            <AlertCircle className="mx-auto mb-2" size={32} />
            <p className="font-medium">{error}</p>
            {onRetry && (
              <button
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                onClick={onRetry}
              >
                Retry
              </button>
            )}
          </div>
        ) : displayData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>
              {emptyMessage}
              {hasActiveFilters ? " matching your filters" : ""}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={String(column.key)}
                      className="text-xs font-semibold text-gray-600 uppercase px-6 py-3 text-left tracking-wider"
                      style={{ width: column.width }}
                    >
                      {column.title}
                    </th>
                  ))}
                  {actions.length > 0 && (
                    <th className="text-xs font-semibold text-gray-600 uppercase px-6 py-3 text-left tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {displayData.map((record, index) => (
                  <tr
                    key={String(record[rowKey])}
                    className={`hover:bg-gray-50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                    onClick={() => onRowClick?.(record, index)}
                  >
                    {columns.map((column) => (
                      <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap">
                        {column.render ? (
                          column.render(getNestedValue(record, String(column.key)), record, index)
                        ) : (
                          <span className="text-sm text-gray-900">
                            {String(getNestedValue(record, String(column.key)) || "")}
                          </span>
                        )}
                      </td>
                    ))}
                    {actions.length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          {actions.map((action) => (
                            <button
                              key={action.key}
                              className={`p-1 rounded-full transition-colors ${
                                action.className || "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                action.onClick(record, index)
                              }}
                              title={action.label}
                            >
                              {action.icon}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Pagination */}
      {pagination?.enabled && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              className="flex items-center px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              <ChevronLeft size={16} className="mr-1" />
              Previous
            </button>
            {getPageNumbers().map((page) => (
              <button
                key={page}
                className={`px-3 py-2 text-sm rounded border transition-colors ${
                  pagination.currentPage === page
                    ? "bg-blue-500 text-white border-blue-500"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => pagination.onPageChange(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="flex items-center px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Next
              <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Constants
const API_URL_ACCIDENTS = "http://localhost:8081"

// ConfirmDialog Component (Placeholder, assuming it's defined elsewhere)
const ConfirmDialog: React.FC<{
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmButtonText: string
  confirmButtonColor: string
}> = ({ isOpen, title, message, onConfirm, onCancel, confirmButtonText, confirmButtonColor }) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-gray-600">{message}</p>
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
            Cancel
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-white rounded ${confirmButtonColor}`}>
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  )
}

// AccidentTable Component
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
  const [pageSize, setPageSize] = useState(10)
  const navigate = useNavigate()

  // Authorization header
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null // Check for window
  const authHeader = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }

  // Fetch Accident Data
  const fetchAccidentData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL_ACCIDENTS}/api/accident`, authHeader)
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
  }, [refreshKey]) // Added refreshKey to dependency array

  useEffect(() => {
    fetchAccidentData()
  }, [fetchAccidentData])

  // Apply Filters (aligned with TableUser's applyFilters)
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
    console.log("Filtered Accidents:", filtered) // Debugging
    return filtered
  }, [accidents, filterValues])

  // Paginate Data (aligned with TableUser's getPaginatedData)
  const getPaginatedData = useCallback(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedData = filteredAccidents.slice(startIndex, endIndex)
    console.log("Paginated Data:", paginatedData) // Debugging
    return paginatedData
  }, [filteredAccidents, currentPage, pageSize])

  // Calculate total pages
  const totalPages = Math.ceil(filteredAccidents.length / pageSize)

  // Handle filter change and reset page
  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page on filter change
  }, [])

  // Reset filters and page
  const resetFilters = useCallback(() => {
    setFilterValues({ status: "", cameraId: "", location: "" })
    setCurrentPage(1) // Reset to first page on filter reset
  }, [])

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page on page size change
  }, [])

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
    const prevWeekAccidents = totalAccidents - Math.floor(Math.random() * 20) // Placeholder for trend
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
                  className={`text-sm flex items-center space-x-2 ${
                    isToday ? "text-green-600 font-bold" : "text-gray-500"
                  }`}
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
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/accidents/${record.id}`)
                  }}
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

  // Pagination configuration
  const pagination = useMemo(
    () => ({
      enabled: true,
      currentPage,
      totalPages,
      pageSize,
      totalItems: filteredAccidents.length,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    }),
    [currentPage, totalPages, pageSize, filteredAccidents.length, handlePageChange, handlePageSizeChange],
  )

  const handleDelete = useCallback(async () => {
    if (modalDeleteId === null) return
    setIsDeleting(true)
    try {
      const res = await fetch(`${API_URL_ACCIDENTS}/api/accident/${modalDeleteId}`, {
        method: "DELETE",
        ...authHeader,
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
  }, [modalDeleteId, fetchAccidentData, authHeader]) // Added authHeader to dependency array

  const handleProcess = useCallback(
    async (id: number) => {
      setIsProcessing(true)
      try {
        const res = await fetch(`${API_URL_ACCIDENTS}/api/accident/${id}/process`, {
          method: "POST",
          ...authHeader,
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
    [fetchAccidentData, authHeader], // Added authHeader to dependency array
  )

  const handleReject = useCallback(
    async (id: number) => {
      setIsRejecting(true)
      try {
        const res = await fetch(`${API_URL_ACCIDENTS}/api/accident/${id}/reject`, {
          method: "POST",
          ...authHeader,
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
    [fetchAccidentData, authHeader], // Added authHeader to dependency array
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
    <div>
      <div className="flex flex-col flex-grow overflow-hidden">
        <div>
          <div className="max-w-full space-y-8">
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
                        className={`text-sm font-medium ${
                          stats.trendPercentage > 0 ? "text-red-500" : "text-green-500"
                        }`}
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
                  {/* Use the new ExportAccidentPDF component here */}
                  <ExportAccidentPDF accidents={filteredAccidents} />
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
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-blue-50/80 px-4 py-2 rounded-xl">
                    <Sparkles size={16} className="text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">{filteredAccidents.length} results</span>
                  </div>
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
                data={getPaginatedData()}
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
                onRowClick={(record) => navigate(`/accidents/${record.id}`)}
                pagination={pagination}
                emptyMessage="🚫 No accident data available"
                className="border-0"
              />
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
