"use client"

import { useParams, useNavigate } from "react-router-dom" // Đã thay đổi từ "next/navigation"
import { useEffect, useState } from "react"
import {
  ArrowLeft,
  Calendar,
  Camera,
  User,
  Mail,
  Car,
  MapPin,
  Clock,
  Edit3,
  Save,
  X,
  Check,
  ImageIcon,
  Video,
  Shield,
  FileText,
  Sparkles,
  Eye,
} from "lucide-react"

// Import components với đường dẫn alias đúng như ban đầu của bạn
import { Button } from "../../components/UI/AccidentUI/button"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/UI/AccidentUI/card"
import { Textarea } from "../../components/UI/AccidentUI/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/UI/AccidentUI/dialog"

// Giữ nguyên đường dẫn cho LoadingScreen và ErrorScreen
import { LoadingScreen, ErrorScreen } from "../../components/UI/AccidentUI/loading"

// Giữ nguyên đường dẫn cho các tiện ích
import { getStatusBadge } from "../../components/Accidents/status-badge"
import { getYouTubeEmbedUrl } from "../../components/Accidents/video-utils"

import type { AccidentType } from "../../types/Accident/accident" // Giữ nguyên đường dẫn type

export default function AccidentDetailsTable() {
  // Đổi tên component về tên gốc
  const { id } = useParams()
  const navigate = useNavigate() // Đã thay đổi từ useRouter

  const [accident, setAccident] = useState<AccidentType | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editDescription, setEditDescription] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageKey, setImageKey] = useState(Date.now())
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setImageLoading(true)
    setDisplayImageUrl(null)
    fetch(`http://localhost:8081/api/accident/${id}`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched accident data:", data)
        console.log("Raw status from API:", data.status)
        console.log("Processed status:", data.status ? data.status.toLowerCase() : "unknown")
        setAccident({
          ...data,
          camera: { id: data.cameraId, name: data.name || "Unknown" },
          accidentTime: new Date(data.accidentTime).toISOString(),
          createdAt: new Date(data.createdAt).toISOString(),
          userFullName: data.userFullName || "No data",
          userEmail: data.userEmail || "No data",
          licensePlate: data.licensePlate || "No data",
          status: data.status ? data.status.toLowerCase() : "unknown",
        })
        setEditDescription(data.description || "")
        setDisplayImageUrl(data.imageUrl ? `${data.imageUrl}?t=${Date.now()}` : null)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Failed to fetch accident data:", error)
        setError("Failed to load accident data")
        setLoading(false)
        setImageLoading(false)
      })
  }, [id])

  const handleSave = async () => {
    if (!accident) return
    try {
      const updatedAccident = { description: editDescription }
      const res = await fetch(`http://localhost:8081/api/accident/${accident.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedAccident),
      })
      const updatedData = await res.json()
      if (!res.ok) {
        alert("Failed to update description.")
        return
      }
      setAccident({
        ...updatedData,
        camera: {
          id: updatedData.cameraId,
          name: updatedData.name || "Unknown",
        },
        accidentTime: new Date(updatedData.accidentTime).toISOString(),
        createdAt: new Date(updatedData.createdAt).toISOString(),
        userFullName: updatedData.userFullName || "No data",
        userEmail: updatedData.userEmail || "No data",
        licensePlate: updatedData.licensePlate || "No data",
        status: updatedData.status ? updatedData.status.toLowerCase() : "unknown",
      })
      setIsEditing(false)
      setShowConfirm(false)
    } catch (error) {
      console.error("Error saving description:", error)
      alert("An error occurred while updating the description.")
    }
  }

  const handleApprove = async () => {
    if (!accident) return
    try {
      const res = await fetch(`http://localhost:8081/api/accident/${accident.id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      })
      const responseText = await res.text()
      let updatedData
      try {
        updatedData = JSON.parse(responseText)
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError)
        alert("Invalid response from server.")
        return
      }
      if (!res.ok) {
        alert("Failed to approve accident.")
        return
      }
      setAccident({
        ...updatedData,
        camera: {
          id: updatedData.camera_id,
          name: updatedData.name || "Unknown",
        },
        accidentTime: new Date(updatedData.accidentTime).toISOString(),
        createdAt: new Date(updatedData.createdAt).toISOString(),
        userFullName: updatedData.userFullName || "No data",
        userEmail: updatedData.userEmail || "No data",
        licensePlate: updatedData.licensePlate || "No data",
        status: updatedData.status ? updatedData.status.toLowerCase() : "unknown",
      })
      navigate("/accidentdashboard") // Đã thay đổi từ router.push
    } catch (error) {
      console.error("Error approving accident:", error)
      alert("An error occurred while approving the accident.")
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (error || !accident) {
    return <ErrorScreen error={error || "Accident Not Found"} onBackClick={() => navigate("/accidentdashboard")} /> // Đã thay đổi từ router.push
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Animated Background Elements - More subtle */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-100/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-200/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-3/4 left-1/2 w-64 h-64 bg-blue-50/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/accidentdashboard")} // Đã thay đổi từ router.push
            className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse-slow">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-blue-800 mb-2">Accident Details</h1>
                  <p className="text-gray-600 font-medium flex items-center">Case ID: #{accident.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(accident.status)}
                {accident.status === "pending" &&
                  (!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="primary" className="inline-flex items-center">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowConfirm(true)}
                        variant="success"
                        className="inline-flex items-center"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditing(false)
                          setEditDescription(accident.description || "")
                        }}
                        variant="secondary"
                        className="inline-flex items-center"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Information */}
            <Card>
              <CardHeader className="bg-blue-700 text-white rounded-t-xl">
                <CardTitle className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                    <Calendar className="w-5 h-5" />
                  </div>
                  Incident Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-300 hover:shadow-md">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Incident Time</p>
                      <p className="text-gray-900 font-semibold">{new Date(accident.accidentTime).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="group flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-300 hover:shadow-md">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Reported At</p>
                      <p className="text-gray-900 font-semibold">{new Date(accident.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="group flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-300 hover:shadow-md">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Location</p>
                      <p className="text-gray-900 font-semibold">{accident.location}</p>
                    </div>
                  </div>
                  <div className="group flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-300 hover:shadow-md">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Camera Source</p>
                      <p className="text-gray-900 font-semibold">{accident.camera.name}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Vehicle Owner Information */}
            <Card>
              <CardHeader className="bg-blue-700 text-white rounded-t-xl">
                <CardTitle className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                    <User className="w-5 h-5" />
                  </div>
                  Vehicle Owner Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-300 hover:shadow-md">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Full Name</p>
                      <p className="text-gray-900 font-semibold">{accident.userFullName}</p>
                    </div>
                  </div>
                  <div className="group flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-300 hover:shadow-md">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Email Address</p>
                      <p className="text-gray-900 font-semibold">{accident.userEmail}</p>
                    </div>
                  </div>
                  <div className="group flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-300 hover:shadow-md md:col-span-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <Car className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">License Plate</p>
                      <div className="mt-2">
                        <span className="inline-block text-gray-900 font-mono font-bold text-lg bg-blue-100 px-4 py-2 rounded-lg border-2 border-blue-200 shadow-sm transition-all duration-300 hover:shadow-md">
                          {accident.licensePlate}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Description */}
            <Card>
              <CardHeader className="bg-blue-700 text-white rounded-t-xl">
                <CardTitle className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-5 h-5" />
                  </div>
                  Incident Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Enter incident description..."
                    className="min-h-[120px] resize-none focus:ring-4 focus:ring-blue-300 border-2 hover:border-blue-300"
                    rows={5}
                  />
                ) : (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 hover:shadow-md transition-all duration-300">
                    <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                      {accident.description || "No description available."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/* Right Column - Media & Actions */}
          <div className="space-y-6">
            {/* Incident Image */}
            <Card>
              <CardHeader className="bg-blue-700 text-white rounded-t-xl">
                <CardTitle className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  Incident Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {displayImageUrl ? (
                    <div className="relative group">
                      {imageLoading && (
                        <div className="bg-blue-50 rounded-lg p-8 text-center animate-pulse border border-blue-200">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-blue-700 font-medium">Loading image...</p>
                        </div>
                      )}
                      <img
                        key={imageKey}
                        src={displayImageUrl || "/placeholder.svg?height=300&width=400"}
                        alt="Incident"
                        className="w-full rounded-lg object-cover shadow-lg border border-gray-200 transition-all duration-500 group-hover:scale-105 group-hover:shadow-xl"
                        style={{
                          maxHeight: "300px",
                          minHeight: "200px",
                          display: imageLoading ? "none" : "block",
                        }}
                        data-image-url={displayImageUrl}
                        onLoad={() => {
                          console.log("Image loaded successfully:", displayImageUrl)
                          setImageLoading(false)
                        }}
                        onError={() => {
                          console.error("Failed to load image:", displayImageUrl)
                          setDisplayImageUrl("/placeholder.svg?height=300&width=400")
                          setImageLoading(false)
                          setImageKey(Date.now())
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-4">
                        <Button size="sm" className="bg-white/90 text-gray-900 hover:bg-white shadow-xl">
                          <Eye className="w-4 h-4 mr-2" />
                          View Full Size
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 rounded-lg p-8 text-center border border-blue-200 hover:shadow-md transition-all duration-300">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-blue-700 font-medium">No image available for this accident</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* Incident Video */}
            <Card>
              <CardHeader className="bg-blue-700 text-white rounded-t-xl">
                <CardTitle className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                    <Video className="w-5 h-5" />
                  </div>
                  Incident Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                {accident.videoUrl ? (
                  <div className="relative group">
                    {getYouTubeEmbedUrl(accident.videoUrl)?.includes("youtube.com") ? (
                      <iframe
                        className="w-full rounded-lg shadow-lg border border-gray-200 transition-all duration-300 group-hover:shadow-xl"
                        style={{ height: "200px" }}
                        src={getYouTubeEmbedUrl(accident.videoUrl) || ""} // Ensure src is always a string
                        title="Incident Video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <>
                        <video
                          src={accident.videoUrl || ""} // Ensure src is always a string
                          controls
                          className="w-full rounded-lg shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl"
                          style={{ maxHeight: "200px" }}
                          onError={(e) => {
                            console.error("Failed to load video:", accident.videoUrl)
                            e.currentTarget.style.display = "none"
                            if (e.currentTarget.nextElementSibling) {
                              ;(e.currentTarget.nextElementSibling as HTMLElement).style.display = "block"
                            }
                          }}
                        />
                        <div
                          className="bg-blue-50 rounded-lg p-8 text-center border border-blue-200"
                          style={{ display: "none" }}
                        >
                          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Video className="w-8 h-8 text-white" />
                          </div>
                          <p className="text-blue-700 font-medium">Failed to load video</p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50 rounded-lg p-8 text-center border border-blue-200 hover:shadow-md transition-all duration-300">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-blue-700 font-medium">No video available for this accident</p>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Approval Action */}
            {accident.status === "pending" && (
              <Card className="border-2 border-blue-300 bg-blue-50 shadow-xl hover:shadow-2xl">
                <CardHeader className="bg-blue-700 text-white rounded-t-xl">
                  <CardTitle className="flex items-center text-white">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                      <Shield className="w-5 h-5" />
                    </div>
                    Review Action
                    <Sparkles className="w-5 h-5 ml-2 animate-pulse-slow" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleApprove}
                    variant="success"
                    className="w-full shadow-xl hover:shadow-2xl"
                    size="lg"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      {/* Enhanced Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-white border-2 border-blue-200 shadow-2xl">
          <DialogHeader>
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Save className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-blue-800">Confirm Changes</DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Are you sure you want to save the updated description? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
