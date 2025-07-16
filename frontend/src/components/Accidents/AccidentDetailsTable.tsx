"use client"
import { useParams, useNavigate } from "react-router-dom"
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
  Eye,
  FileText,
  Sparkles,
} from "lucide-react"

// Import components
import { Button } from "../UI/AccidentUI/button"
import { Card, CardHeader, CardTitle, CardContent } from "../UI/AccidentUI/card"
import { Textarea } from "../UI/AccidentUI/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../UI/AccidentUI/dialog"
import { LoadingScreen, ErrorScreen } from "../UI/AccidentUI/loading"

// Import utilities
import { getStatusBadge } from "../Accidents/status-badge"
import { getYouTubeEmbedUrl } from "../Accidents/video-utils"
import type { AccidentType } from "../../types/Accident/accident"

export default function AccidentDetailsTable() {
  const { id } = useParams()
  const navigate = useNavigate()
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
        setAccident({
          ...data,
          camera: { id: data.camera_id, name: data.name || "Unknown" },
          accident_time: new Date(data.accident_time).toISOString(),
          created_at: new Date(data.created_at).toISOString(),
          user_fullName: data.user_fullName || "No data",
          user_email: data.user_email || "No data",
          licensePlate: data.licensePlate || "No data",
          status: data.status ? data.status.toLowerCase() : "unknown",
        })
        setEditDescription(data.description || "")
        setDisplayImageUrl(data.image_url ? `${data.image_url}?t=${Date.now()}` : null)
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
          id: updatedData.camera_id,
          name: updatedData.name || "Unknown",
        },
        accident_time: new Date(updatedData.accident_time).toISOString(),
        created_at: new Date(updatedData.created_at).toISOString(),
        user_fullName: updatedData.user_fullName || "No data",
        user_email: updatedData.user_email || "No data",
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
        accident_time: new Date(updatedData.accident_time).toISOString(),
        created_at: new Date(updatedData.created_at).toISOString(),
        user_fullName: updatedData.user_fullName || "No data",
        user_email: updatedData.user_email || "No data",
        licensePlate: updatedData.licensePlate || "No data",
        status: updatedData.status ? updatedData.status.toLowerCase() : "unknown",
      })
      navigate("/accidentdashboard")
    } catch (error) {
      console.error("Error approving accident:", error)
      alert("An error occurred while approving the accident.")
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (error || !accident) {
    return <ErrorScreen error={error || "Accident Not Found"} onBackClick={() => navigate("/accidentdashboard")} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-blue-300/20 to-purple-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-pink-300/20 to-orange-300/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-3/4 left-1/2 w-64 h-64 bg-gradient-to-br from-green-300/20 to-teal-300/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/accidentdashboard")}
            className="mb-6 inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                    Accident Details
                  </h1>
                  <p className="text-gray-600 font-medium flex items-center">Case ID: #{accident.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(accident.status)}
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="primary" className="inline-flex items-center">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={() => setShowConfirm(true)} variant="success" className="inline-flex items-center">
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
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Information */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-xl">
                <CardTitle className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3 animate-pulse">
                    <Calendar className="w-5 h-5" />
                  </div>
                  Incident Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg transform hover:scale-105">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg group-hover:animate-bounce">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Incident Time</p>
                      <p className="text-gray-900 font-semibold">{new Date(accident.accident_time).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="group flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200 hover:border-purple-300 transition-all duration-300 hover:shadow-lg transform hover:scale-105">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg group-hover:animate-spin">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-700">Reported At</p>
                      <p className="text-gray-900 font-semibold">{new Date(accident.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="group flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg transform hover:scale-105">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg group-hover:animate-pulse">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-700">Location</p>
                      <p className="text-gray-900 font-semibold">{accident.location}</p>
                    </div>
                  </div>
                  <div className="group flex items-center space-x-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200 hover:border-orange-300 transition-all duration-300 hover:shadow-lg transform hover:scale-105">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg group-hover:animate-bounce">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-orange-700">Camera Source</p>
                      <p className="text-gray-900 font-semibold">{accident.camera.name}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Owner Information */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-xl">
                <CardTitle className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3 animate-pulse">
                    <User className="w-5 h-5" />
                  </div>
                  Vehicle Owner Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg transform hover:scale-105">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg group-hover:animate-bounce">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-700">Full Name</p>
                      <p className="text-gray-900 font-semibold">{accident.user_fullName}</p>
                    </div>
                  </div>
                  <div className="group flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg transform hover:scale-105">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg group-hover:animate-pulse">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Email Address</p>
                      <p className="text-gray-900 font-semibold">{accident.user_email}</p>
                    </div>
                  </div>
                  <div className="group flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200 hover:border-purple-300 transition-all duration-300 hover:shadow-lg transform hover:scale-105 md:col-span-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg group-hover:animate-spin">
                      <Car className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-700">License Plate</p>
                      <div className="mt-2">
                        <span className="inline-block text-gray-900 font-mono font-bold text-lg bg-gradient-to-r from-yellow-200 to-orange-200 px-4 py-2 rounded-lg border-2 border-yellow-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 animate-pulse">
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
              <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-t-xl">
                <CardTitle className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3 animate-pulse">
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
                    className="min-h-[120px] resize-none focus:ring-4 focus:ring-orange-300 border-2 hover:border-orange-300"
                    rows={5}
                  />
                ) : (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]">
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
              <CardHeader className="bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-t-xl">
                <CardTitle className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3 animate-pulse">
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
                        <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-8 text-center animate-pulse border border-pink-200">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-2"></div>
                          <p className="text-pink-700 font-medium">Loading image...</p>
                        </div>
                      )}
                      <img
                        key={imageKey}
                        src={displayImageUrl || "/placeholder.svg"}
                        alt="Incident"
                        className="w-full rounded-lg object-cover shadow-lg border border-gray-200 transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl"
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
                          setDisplayImageUrl("https://via.placeholder.com/400x300?text=Image+Not+Found")
                          setImageLoading(false)
                          setImageKey(Date.now())
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-4">
                        <Button size="sm" className="bg-white/90 text-gray-900 hover:bg-white shadow-xl animate-bounce">
                          <Eye className="w-4 h-4 mr-2" />
                          View Full Size
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-8 text-center border border-pink-200 hover:shadow-lg transition-all duration-300">
                      <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-lg">
                        <ImageIcon className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-pink-700 font-medium">No image available for this accident</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Incident Video */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-t-xl">
                <CardTitle className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3 animate-pulse">
                    <Video className="w-5 h-5" />
                  </div>
                  Incident Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                {accident.video_url ? (
                  <div className="relative group">
                    {getYouTubeEmbedUrl(accident.video_url)?.includes("youtube.com") ? (
                      <iframe
                        className="w-full rounded-lg shadow-lg border border-gray-200 transition-all duration-300 group-hover:shadow-2xl"
                        style={{ height: "200px" }}
                        src={getYouTubeEmbedUrl(accident.video_url)}
                        title="Incident Video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <>
                        <video
                          src={accident.video_url}
                          controls
                          className="w-full rounded-lg shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-2xl"
                          style={{ maxHeight: "200px" }}
                          onError={(e) => {
                            console.error("Failed to load video:", accident.video_url)
                            e.currentTarget.style.display = "none"
                            if (e.currentTarget.nextElementSibling) {
                              ;(e.currentTarget.nextElementSibling as HTMLElement).style.display = "block"
                            }
                          }}
                        />
                        <div
                          className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-8 text-center border border-indigo-200"
                          style={{ display: "none" }}
                        >
                          <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-lg">
                            <Video className="w-8 h-8 text-white" />
                          </div>
                          <p className="text-indigo-700 font-medium">Failed to load video</p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-8 text-center border border-indigo-200 hover:shadow-lg transition-all duration-300">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-lg">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-indigo-700 font-medium">No video available for this accident</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approval Action */}
            {accident.status === "pending" && (
              <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl hover:shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-xl">
                  <CardTitle className="flex items-center text-white">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3 animate-pulse">
                      <Shield className="w-5 h-5" />
                    </div>
                    Review Action
                    <Sparkles className="w-5 h-5 ml-2 animate-spin" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleApprove}
                    variant="success"
                    className="w-full shadow-xl hover:shadow-2xl"
                    size="lg"
                  >
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
        <DialogContent className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 shadow-2xl">
          <DialogHeader>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse shadow-xl">
              <Save className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-center text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Confirm Changes
            </DialogTitle>
            <DialogDescription className="text-center">
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
