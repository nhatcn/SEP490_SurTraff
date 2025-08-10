"use client"

import { Car, Clock, MapPin, AlertTriangle, CheckCircle, XCircle, Activity, ArrowLeft } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { getCookie } from "../utils/cookieUltil"

interface Violation {
  id: number
  plateNumber: string
  violationType: string
  location: string
  time: string
  status: string
  displayStatus: string
  image: string
}

interface RecentViolationsSectionProps {
  hasSearched: boolean
  searchResults: Violation[]
  isSearching: boolean
  currentSearchQuery: string
  resetSearch: () => void
}

export default function RecentViolationsSection({
  hasSearched,
  searchResults,
  isSearching,
  currentSearchQuery,
  resetSearch,
}: RecentViolationsSectionProps) {
  const [recentViolations, setRecentViolations] = useState<Violation[]>([])
  const [isLoadingRecentViolations, setIsLoadingRecentViolations] = useState(true)
  const [errorRecentViolations, setErrorRecentViolations] = useState<string | null>(null)
  const [requestingId, setRequestingId] = useState<number | null>(null)
  const [requestMessage, setRequestMessage] = useState<string | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  const navigate = useNavigate()

  useEffect(() => {
    if (hasSearched && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [hasSearched])

  useEffect(() => {
    const fetchRecentViolations = async () => {
      setIsLoadingRecentViolations(true)
      setErrorRecentViolations(null)
      try {
        const userId = getCookie("userId")
        if (!userId) {
          throw new Error("User ID not found in cookie")
        }
        const response = await fetch(`API_URL_BEapi/violations/user/${userId}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        const transformedData: Violation[] = data
          .map((item: any) => {
            let displayStatusText = item.status
            if (item.status === "APPROVED") {
              displayStatusText = "New"
            }
            return {
              id: item.id,
              plateNumber: item.vehicle?.licensePlate || "N/A",
              violationType: item.violationDetails?.[0]?.violationType?.typeName || "Unknown",
              location: item.violationDetails?.[0]?.location || "N/A",
              time: item.violationDetails?.[0]?.violationTime
                ? new Date(item.violationDetails[0].violationTime).toLocaleString()
                : "N/A",
              status: item.status,
              displayStatus: displayStatusText,
              image: item.violationDetails?.[0]?.imageUrl || "/placeholder.svg",
            }
          })
          .filter(
            (violation: Violation) =>
              violation.status === "APPROVED" ||
              violation.status === "REQUEST" ||
              violation.status === "PROCESSED" ||
              violation.status === "REJECT",
          )
        setRecentViolations(transformedData)
      } catch (error) {
        console.error("Failed to fetch recent violations:", error)
        setErrorRecentViolations("Failed to load recent violations. Please try again later.")
      } finally {
        setIsLoadingRecentViolations(false)
      }
    }

    fetchRecentViolations()
  }, [])

  const handleRequestToView = async (id: number) => {
    setRequestingId(id)
    setRequestMessage(null)
    try {
      const response = await fetch(`API_URL_BEapi/violations/${id}/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      setRequestMessage("Request Sent Successfully! Reloading page...")
      setTimeout(() => window.location.reload(), 1500)
    } catch (error: any) {
      console.error("Failed to send request:", error)
      setRequestMessage(`Failed to send request: ${error.message}`)
      setTimeout(() => setRequestMessage(null), 3000)
    } finally {
      setRequestingId(null)
    }
  }

  const violationsToDisplay = hasSearched ? searchResults : recentViolations

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800 border border-green-200"
      case "REQUEST":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200"
      case "PROCESSED":
        return "bg-blue-100 text-blue-800 border border-blue-200"
      case "REJECT":
        return "bg-red-100 text-red-800 border border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="w-4 h-4 mr-1" />
      case "REQUEST":
        return <AlertTriangle className="w-4 h-4 mr-1" />
      case "PROCESSED":
        return <Activity className="w-4 h-4 mr-1" />
      case "REJECT":
        return <XCircle className="w-4 h-4 mr-1" />
      default:
        return null
    }
  }

  return (
    <div ref={sectionRef} className="py-20 relative z-[10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {hasSearched && (
          <div className="mb-12">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20 mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Search Results for "{currentSearchQuery}"</h2>
              <p className="text-gray-600">
                {searchResults.length} violation{searchResults.length !== 1 ? "s" : ""} found
              </p>
            </div>
            {isSearching ? (
              <div className="text-center py-16 bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Searching...</h3>
                <p className="text-gray-600 text-lg">Please wait while we find violations for you.</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-16 bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20">
                <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">No Violations Found</h3>
                <p className="text-gray-600 text-lg">
                  This license plate has a clean record with no traffic violations
                </p>
                <button
                  onClick={resetSearch}
                  className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-6 rounded-2xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center mx-auto"
                  aria-label="Back to recent violations"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Recent Violations
                </button>
              </div>
            ) : (
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Search Results</h2>
                      <p className="text-gray-600 mt-1">Violations matching your search query</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/50 rounded-full px-4 py-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">Live Data</span>
                    </div>
                  </div>
                </div>
                {requestMessage && (
                  <div
                    className={`p-4 text-center font-medium ${
                      requestMessage.includes("Successfully") ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                    }`}
                  >
                    {requestMessage}
                  </div>
                )}
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
                        <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50">
                      {searchResults.map((violation) => (
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
                              className={`inline-flex items-center px-3 py-1 text-sm font-bold rounded-full ${getStatusClasses(violation.status)}`}
                            >
                              {getStatusIcon(violation.status)}
                              {violation.displayStatus}
                            </span>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="w-44">
                              {violation.status === "PROCESSED" ? (
                                <button
                                  onClick={() => navigate(`/violationsdetails/${violation.id}`)}
                                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-4 rounded-xl transition-all duration-300 font-semibold shadow-md hover:shadow-lg"
                                  aria-label={`View details for violation ${violation.id}`}
                                >
                                  View Full Details
                                </button>
                              ) : violation.status === "APPROVED" ? (
                                <button
                                  onClick={() => handleRequestToView(violation.id)}
                                  disabled={requestingId === violation.id}
                                  className="w-full bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white py-2 px-4 rounded-xl transition-all duration-300 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label={`Request to view violation ${violation.id}`}
                                >
                                  {requestingId === violation.id ? "Sending Request..." : "Request to View"}
                                </button>
                              ) : (
                                <div className="h-10 flex items-center justify-center text-gray-500 text-sm w-full">
                                  No action available
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
            {requestMessage && (
              <div
                className={`p-4 text-center font-medium ${
                  requestMessage.includes("Successfully") ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                }`}
              >
                {requestMessage}
              </div>
            )}
            {isLoadingRecentViolations ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-gray-600">Loading recent violations...</p>
              </div>
            ) : errorRecentViolations ? (
              <div className="text-center py-16 text-red-600">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <p>{errorRecentViolations}</p>
              </div>
            ) : (
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
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {violationsToDisplay.map((violation) => (
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
                            className={`inline-flex items-center px-3 py-1 text-sm font-bold rounded-full ${getStatusClasses(violation.status)}`}
                          >
                            {getStatusIcon(violation.status)}
                            {violation.displayStatus}
                          </span>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="w-44">
                            {violation.status === "PROCESSED" ? (
                              <button
                                onClick={() => navigate(`/violationsuser/${violation.id}`)}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-4 rounded-xl transition-all duration-300 font-semibold shadow-md hover:shadow-lg"
                                aria-label={`View details for violation ${violation.id}`}
                              >
                                View Full Details
                              </button>
                            ) : violation.status === "APPROVED" ? (
                              <button
                                onClick={() => handleRequestToView(violation.id)}
                                disabled={requestingId === violation.id}
                                className="w-full bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white py-2 px-4 rounded-xl transition-all duration-300 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label={`Request to view violation ${violation.id}`}
                              >
                                {requestingId === violation.id ? "Sending Request..." : "Request to View"}
                              </button>
                            ) : (
                              <div className="h-10 flex items-center justify-center text-gray-500 text-sm w-full">
                                No action available
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
