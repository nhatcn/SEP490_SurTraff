"use client";

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../components/UI/AccidentUI/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/UI/AccidentUI/card";
import { Textarea } from "../../components/UI/AccidentUI/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/UI/AccidentUI/dialog";
import {
  LoadingScreen,
  ErrorScreen,
} from "../../components/UI/AccidentUI/loading";
import { getStatusBadge } from "../../components/Accidents/status-badge";
import { getYouTubeEmbedUrl } from "../../components/Accidents/video-utils";
import type { AccidentType } from "../../types/Accident/accident";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "react-toastify";

export default function AccidentDetailsTable() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [accident, setAccident] = useState<AccidentType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageKey, setImageKey] = useState(Date.now());
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    const statusMap: {
      [key: string]: { bg: string; text: string; icon: React.ReactNode };
    } = {
      pending: {
        bg: "bg-gray-100",
        text: "text-gray-500",
        icon: <div className="w-2 h-2 bg-gray-400 rounded-full" />,
      },
      approved: {
        bg: "bg-green-100",
        text: "text-green-700",
        icon: <CheckCircle2 className="text-green-500" size={14} />,
      },
      rejected: {
        bg: "bg-red-100",
        text: "text-red-700",
        icon: <XCircle className="text-red-500" size={14} />,
      },
      processed: {
        bg: "bg-teal-100",
        text: "text-teal-700",
        icon: <CheckCircle2 className="text-teal-500" size={14} />,
      },
    };
    return (
      statusMap[status.toLowerCase()] || {
        bg: "bg-gray-100",
        text: "text-gray-500",
        icon: <div className="w-2 h-2 bg-gray-400 rounded-full" />,
      }
    );
  };

  // Validation function for description
  const validateDescription = (desc: string): string | null => {
    if (!desc.trim()) {
      return "Description cannot be empty.";
    }
    if (/^\d+$/.test(desc.trim())) {
      return "Description cannot contain only numbers.";
    }
    if (/[^a-zA-Z0-9\s,.!?-]/.test(desc)) {
      return "Description cannot contain special characters (except ,.!?-).";
    }
    if (desc.length > 1000) {
      return "Description cannot exceed 1000 characters.";
    }
    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setImageLoading(true);
      setDisplayImageUrl(null);
      try {
        const res = await fetch(`API_URL_BEapi/accident/${id}`);
        const data = await res.json();
        setAccident({
          ...data,
          camera: { id: data.cameraId, name: data.cameraName || "Unknown" },
          accidentTime: new Date(data.accidentTime).toISOString(),
          createdAt: new Date(data.createdAt).toISOString(),
          userFullName: data.userFullName || "No data",
          userEmail: data.userEmail || "No data",
          licensePlate: data.licensePlate || "No data",
          status: data.status ? data.status.toLowerCase() : "unknown",
        });
        setEditDescription(data.description || "");
        setDisplayImageUrl(
          data.imageUrl ? `${data.imageUrl}?t=${Date.now()}` : null
        );
      } catch (error) {
        console.error("Failed to fetch accident data:", error);
        setError("Failed to load accident data");
      } finally {
        setLoading(false);
        setImageLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!accident) return;

    const validationError = validateDescription(editDescription);
    if (validationError) {
      setDescriptionError(validationError);
      return;
    }

    try {
      const updatedAccident = { description: editDescription };
      const res = await fetch(
        `API_URL_BEapi/accident/${accident.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedAccident),
        }
      );
      if (!res.ok) {
        throw new Error("Failed to update");
      }
      const updatedData = await res.json();
      setAccident({
        ...updatedData,
        camera: {
          id: updatedData.cameraId,
          name: updatedData.cameraName || "Unknown",
        },
        accidentTime: new Date(updatedData.accidentTime).toISOString(),
        createdAt: new Date(updatedData.createdAt).toISOString(),
        userFullName: updatedData.userFullName || "No data",
        userEmail: updatedData.userEmail || "No data",
        licensePlate: updatedData.licensePlate || "No data",
        status: updatedData.status
          ? updatedData.status.toLowerCase()
          : "unknown",
      });
      setIsEditing(false);
      setShowConfirm(false);
      setDescriptionError(null);
      toast.success("Description updated successfully!");
    } catch (error) {
      console.error("Error saving description:", error);
      toast.error("An error occurred while updating the description.");
    }
  };

  const handleApprove = async () => {
    if (!accident) return;
    try {
      const res = await fetch(
        `API_URL_BEapi/accident/${accident.id}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!res.ok) {
        throw new Error("Failed to approve");
      }
      const updatedData = await res.json();
      setAccident({
        ...updatedData,
        camera: {
          id: updatedData.cameraId,
          name: updatedData.cameraName || "Unknown",
        },
        accidentTime: new Date(updatedData.accidentTime).toISOString(),
        createdAt: new Date(updatedData.createdAt).toISOString(),
        userFullName: updatedData.userFullName || "No data",
        userEmail: updatedData.userEmail || "No data",
        licensePlate: updatedData.licensePlate || "No data",
        status: updatedData.status
          ? updatedData.status.toLowerCase()
          : "unknown",
      });
      toast.success("Accident approved!");
      navigate("/accidentdashboard");
    } catch (error) {
      console.error("Error approving accident:", error);
      toast.error("An error occurred while approving the accident.");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`API_URL_BEapi/accident/${id}`);
      const data = await res.json();
      setAccident({
        ...data,
        camera: { id: data.cameraId, name: data.cameraName || "Unknown" },
        accidentTime: new Date(data.accidentTime).toISOString(),
        createdAt: new Date(data.createdAt).toISOString(),
        userFullName: data.userFullName || "No data",
        userEmail: data.userEmail || "No data",
        licensePlate: data.licensePlate || "No data",
        status: data.status ? data.status.toLowerCase() : "unknown",
      });
      setEditDescription(data.description || "");
      setDisplayImageUrl(
        data.imageUrl ? `${data.imageUrl}?t=${Date.now()}` : null
      );
      toast.success("Data refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Unable to refresh data.");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !accident) {
    return (
      <ErrorScreen
        error={error || "Accident Not Found"}
        onBackClick={() => navigate("/accidentdashboard")}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-100 via-gray-50 to-blue-100 overflow-hidden">
      <div className="flex flex-col flex-grow overflow-hidden">
        <div className="p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header Section */}
            <motion.div
              className="bg-gradient-to-r from-white/90 via-blue-50/90 to-purple-50/90 rounded-2xl shadow-xl border border-blue-200/70 p-6 backdrop-blur-md"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/40 animate-pulse">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Accident #{accident.id}
                    </h1>
                    <p className="text-gray-600 flex items-center mt-1">
                      <svg
                        className="w-4 h-4 mr-1 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Recorded at{" "}
                      {accident.accidentTime
                        ? format(
                            new Date(accident.accidentTime),
                            "dd/MM/yyyy 'at' HH:mm:ss"
                          )
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-lg ${
                      getStatusColor(accident.status).bg
                    } ${getStatusColor(accident.status).text} font-medium`}
                  >
                    {getStatusColor(accident.status).icon}
                    <span className="ml-2 capitalize">
                      {accident.status || "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/accidentdashboard")}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-200 to-blue-200 text-gray-800 rounded-xl hover:from-gray-300 hover:to-blue-300 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-400/30 relative overflow-hidden group"
                  aria-label="Back to dashboard"
                >
                  <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                  <svg
                    className="w-4 h-4 mr-2 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                  aria-label="Refresh data"
                >
                  <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                  <RefreshCw size={16} className={refreshing ? "animate-spin mr-2" : "mr-2"} />
                  Refresh
                </button>
                
                {/* Chỉ hiển thị Edit Detail khi status là pending */}
                {accident.status === "pending" && (
                  <>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/40 relative overflow-hidden group"
                        aria-label="Edit detail"
                      >
                        <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Edit Detail
                      </button>
                    ) : (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            const validationError = validateDescription(editDescription)
                            if (validationError) {
                              setDescriptionError(validationError)
                            } else {
                              setShowConfirm(true)
                            }
                          }}
                          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/40 relative overflow-hidden group"
                          aria-label="Save changes"
                        >
                          <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Save Changes
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false)
                            setEditDescription(accident.description || "")
                            setDescriptionError(null)
                          }}
                          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-xl hover:from-rose-600 hover:to-red-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-rose-500/40 relative overflow-hidden group"
                          aria-label="Cancel edit"
                        >
                          <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          Cancel
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Media Section */}
              <div className="lg:col-span-2 space-y-6">
                {/* Image */}
                {displayImageUrl ? (
                  <motion.div 
                    className="bg-gradient-to-br from-white/95 to-blue-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50 transform hover:scale-[1.02] transition-all duration-300"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-cyan-600 bg-clip-text text-transparent mb-4 flex items-center">
                      <div className="w-6 h-6 mr-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center animate-pulse-slow">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      Accident Image
                    </h3>
                    <div className="relative group">
                      <img
                        src={displayImageUrl}
                        alt="Accident Image"
                        className="w-full h-auto rounded-xl border-2 border-blue-200/50 cursor-pointer transition-all duration-300 group-hover:border-blue-400 group-hover:shadow-2xl group-hover:shadow-blue-400/40"
                        loading="lazy"
                        onClick={() => setImageExpanded(true)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 transform scale-90 group-hover:scale-100 transition-all duration-300">
                          <Eye className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    className="bg-gradient-to-br from-white/95 to-gray-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-gray-200/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="text-center py-16 text-gray-500">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-400 to-blue-400 rounded-full flex items-center justify-center animate-pulse">
                        <svg
                          className="w-10 h-10 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <p className="font-medium text-gray-600">No image available</p>
                    </div>
                  </motion.div>
                )}

                {/* Video */}
                {accident.videoUrl ? (
                  <motion.div 
                    className="bg-gradient-to-br from-white/95 to-blue-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50 transform hover:scale-[1.02] transition-all duration-300"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-cyan-600 bg-clip-text text-transparent mb-4 flex items-center">
                      <div className="w-6 h-6 mr-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center animate-pulse-slow">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      Accident Video
                    </h3>
                    <div className="relative">
                      <video
                        src={accident.videoUrl}
                        controls
                        className="w-full rounded-xl border-2 border-blue-200/50 transition-all duration-300 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-400/40"
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    className="bg-gradient-to-br from-white/95 to-gray-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-gray-200/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <div className="text-center py-16 text-gray-500">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-400 to-blue-400 rounded-full flex items-center justify-center animate-pulse">
                        <svg
                          className="w-10 h-10 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <p className="font-medium text-gray-600">No video available</p>
                    </div>
                  </motion.div>
                )}

                {/* Update Status Section - Chỉ hiển thị khi status là pending */}
                {accident.status === "pending" && (
                  <motion.div
                    className="bg-gradient-to-br from-white/95 to-blue-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-cyan-600 bg-clip-text text-transparent mb-4 flex items-center">
                      <div className="w-6 h-6 mr-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center animate-pulse-slow">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      Update Status 
                    </h3>
                    <button
                      onClick={handleApprove}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/40 relative overflow-hidden group"
                      aria-label="Approve accident"
                    >
                      <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Approve
                    </button>
                  </motion.div>
                )}
              </div>
              
              {/* Details Section */}
              <div className="space-y-6">
                {/* Vehicle Owner Information */}
                <motion.div
                  className="bg-gradient-to-br from-white/95 to-blue-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-cyan-600 bg-clip-text text-transparent mb-4 flex items-center">
                    <div className="w-6 h-6 mr-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center animate-pulse-slow">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    Vehicle Owner Information
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 font-medium">
                        Full Name:
                      </span>
                      <span className="font-semibold text-blue-900 bg-blue-100/80 px-3 py-1 rounded-xl">
                        {accident.userFullName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 font-medium">Email:</span>
                      <span className="font-semibold text-blue-900 bg-blue-100/80 px-3 py-1 rounded-xl">
                        {accident.userEmail}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 font-medium">
                        License Plate:
                      </span>
                      <span className="font-semibold text-blue-900 font-mono bg-blue-100/80 px-3 py-1 rounded-xl">
                        {accident.licensePlate}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Incident Information */}
                <motion.div
                  className="bg-gradient-to-br from-white/95 to-blue-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-cyan-600 bg-clip-text text-transparent mb-4 flex items-center">
                    <div className="w-6 h-6 mr-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center animate-pulse-slow">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    Incident Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-blue-700 font-medium mb-1">
                        Incident Time:
                      </label>
                      <span className="font-semibold text-blue-900 bg-blue-100/80 px-3 py-1 rounded-xl flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-blue-500" />
                        {format(
                          new Date(accident.accidentTime),
                          "dd/MM/yyyy HH:mm:ss"
                        )}
                      </span>
                    </div>
                    <div>
                      <label className="block text-blue-700 font-medium mb-1">
                        Location:
                      </label>
                      <span className="font-semibold text-blue-900 bg-blue-100/80 px-3 py-1 rounded-xl flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                        {accident.location || "N/A"}
                      </span>
                    </div>
                    <div>
                      <label className="block text-blue-700 font-medium mb-1">
                        Camera:
                      </label>
                      <span className="font-semibold text-blue-900 bg-blue-100/80 px-3 py-1 rounded-xl flex items-center">
                        <Camera className="w-4 h-4 mr-2 text-blue-500" />
                        {accident.camera.name}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Description */}
                <motion.div
                  className="bg-gradient-to-br from-white/95 to-blue-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-cyan-600 bg-clip-text text-transparent mb-4 flex items-center">
                    <div className="w-6 h-6 mr-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center animate-pulse-slow">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    Incident Description
                  </h3>
                  {isEditing ? (
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full border border-blue-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm transition-all duration-300 min-h-[150px]"
                      rows={5}
                    />
                  ) : (
                    <div className="bg-blue-50/80 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-blue-700">
                        {accident.description || "No description available"}
                      </p>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Image Expanded Modal */}
            {imageExpanded && displayImageUrl && (
              <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="relative max-w-7xl max-h-full">
                  <button
                    onClick={() => setImageExpanded(false)}
                    className="absolute top-4 right-4 text-white hover:text-blue-300 transition-colors duration-300 bg-black/50 rounded-full p-2"
                    aria-label="Close image"
                  >
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <img
                    src={displayImageUrl}
                    alt="Accident Image"
                    className="max-w-full max-h-full object-contain rounded-xl border-2 border-blue-200/50 shadow-2xl shadow-blue-400/40"
                    onClick={() => setImageExpanded(false)}
                  />
                </div>
              </div>
            )}

            {/* Confirmation Dialog */}
            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
              <DialogContent className="bg-white border-2 border-blue-200 shadow-2xl rounded-2xl p-8">
                <DialogHeader>
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-bounce-slow">
                    <Save className="w-10 h-10 text-white" />
                  </div>
                  <DialogTitle className="text-center text-2xl font-bold text-blue-800 mb-2">
                    Confirm Changes
                  </DialogTitle>
                  <DialogDescription className="text-center text-gray-600 text-lg">
                    Are you sure you want to save the updated description? This
                    action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                    className="flex items-center px-6 py-3 text-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    className="flex items-center bg-blue-600 hover:bg-blue-700 px-6 py-3 text-lg"
                  >
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
