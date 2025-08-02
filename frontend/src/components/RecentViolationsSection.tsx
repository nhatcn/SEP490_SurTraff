"use client"
import { Car, Clock, MapPin, AlertTriangle, CheckCircle, XCircle, Activity } from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

interface Violation {
  id: number
  plateNumber: string
  violationType: string
  location: string
  time: string
  status: string // This will be the original status from the API
  displayStatus: string // This will be the status displayed on screen
  image: string
}

interface RecentViolationsSectionProps {
  hasSearched: boolean
  searchResults: Violation[]
  isSearching: boolean
  currentSearchQuery: string
}

export default function RecentViolationsSection({
  hasSearched,
  searchResults,
  isSearching,
  currentSearchQuery,
}: RecentViolationsSectionProps) {
  const [recentViolations, setRecentViolations] = useState<Violation[]>([])
  const [isLoadingRecentViolations, setIsLoadingRecentViolations] = useState(true)
  const [errorRecentViolations, setErrorRecentViolations] = useState<string | null>(null)
  const [requestingId, setRequestingId] = useState<number | null>(null)
  const [requestMessage, setRequestMessage] = useState<string | null>(null)

  const navigate = useNavigate()

  useEffect(() => {
    const fetchRecentViolations = async () => {
      setIsLoadingRecentViolations(true)
      setErrorRecentViolations(null)
      try {
        const response = await fetch("http://localhost:8081/api/accident/user/9")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        const transformedData: Violation[] = data
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
              time: new Date(item.accidentTime).toLocaleString(), // Format date/time
              status: item.status, // Keep original status for filtering
              displayStatus: displayStatusText, // Status to display
              image: item.imageUrl || "/placeholder.svg",
            }
          })
          .filter(
            (violation: Violation) =>
              violation.status === "Approved" ||
              violation.status === "Requested" ||
              violation.status === "Processed" ||
              violation.status === "Rejected",
          ) // Filter for specific statuses
        setRecentViolations(transformedData)
      } catch (error) {
        console.error("Failed to fetch recent violations:", error)
        setErrorRecentViolations("Failed to load recent violations. Please try again later.")
      } finally {
        setIsLoadingRecentViolations(false)
      }
    }

    fetchRecentViolations()
  }, []) // Empty dependency array means this runs once on mount

  const handleRequestToView = async (id: number) => {
    setRequestingId(id)
    setRequestMessage(null) // Clear previous message
    try {
      const response = await fetch(`http://localhost:8081/api/accident/${id}/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add any necessary authentication headers here
        },
        // body: JSON.stringify({ userId: 7 }), // If the API expects a body, uncomment and adjust
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      setRequestMessage("Request Sent Successfully! Reloading page...")
      // Reload the page to fetch updated data and reflect status change
      setTimeout(() => window.location.reload(), 1500) // Reload after a short delay to show message
    } catch (error: any) {
      console.error("Failed to send request:", error)
      setRequestMessage(`Failed to send request: ${error.message}`)
      setTimeout(() => setRequestMessage(null), 3000) // Clear message after 3 seconds if error
    } finally {
      setRequestingId(null)
    }
  }

  const violationsToDisplay = hasSearched ? searchResults : recentViolations

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800 border border-green-200"
      case "Requested":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200"
      case "Processed":
        return "bg-blue-100 text-blue-800 border border-blue-200"
      case "Rejected":
        return "bg-red-100 text-red-800 border border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200" // Fallback for unexpected statuses
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return <CheckCircle className="w-4 h-4 mr-1" />
      case "Requested":
        return <AlertTriangle className="w-4 h-4 mr-1" />
      case "Processed":
        return <Activity className="w-4 h-4 mr-1" />
      case "Rejected":
        return <XCircle className="w-4 h-4 mr-1" />
      default:
        return null
    }
  }

  return (
    <div className="py-20 relative z-[10]">
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
                          className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-xl border ${getStatusClasses(violation.status)}`}
                        >
                          {violation.displayStatus}
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
                      </div>
                      {violation.status === "Processed" ? (
                        <button
                          onClick={() => navigate(`/accidents/${violation.id}`)}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-6 rounded-2xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          View Full Details
                        </button>
                      ) : violation.status === "Approved" ? (
                        <button
                          onClick={() => handleRequestToView(violation.id)}
                          disabled={requestingId === violation.id}
                          className="w-full bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white py-3 px-6 rounded-2xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {requestingId === violation.id ? "Sending Request..." : "Request to View"}
                        </button>
                      ) : (
                        // For Requested and Rejected statuses, no button is displayed
                        <div className="h-12 flex items-center justify-center text-gray-500 text-sm">
                          No action available
                        </div>
                      )}
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
                          {violation.status === "Processed" ? (
                            <button
                              onClick={() => navigate(`/accidentsdetails/${violation.id}`)}
                              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-4 rounded-xl transition-all duration-300 font-semibold shadow-md hover:shadow-lg"
                            >
                              View Full Details
                            </button>
                          ) : violation.status === "Approved" ? (
                            <button
                              onClick={() => handleRequestToView(violation.id)}
                              disabled={requestingId === violation.id}
                              className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white py-2 px-4 rounded-xl transition-all duration-300 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {requestingId === violation.id ? "Sending Request..." : "Request to View"}
                            </button>
                          ) : (
                            // For Requested and Rejected statuses, no button is displayed
                            <div className="h-10 flex items-center justify-center text-gray-500 text-sm">—</div>
                          )}
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
