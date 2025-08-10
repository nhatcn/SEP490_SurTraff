import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../../components/Layout/Sidebar";
import Header from "../../components/Layout/Header";
import axios from "axios";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { Eye, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import API_URL_BE from "../../components/Link/LinkAPI";

interface Camera {
  id: number;
  name: string;
  location: string;
  streamUrl?: string;
  thumbnail?: string;
  zoneId?: number | null;
  latitude?: number;
  longitude?: number;
}

interface ViolationType {
  id: number;
  typeName: string;
  description?: string | null;
}

interface VehicleType {
  id: number;
  typeName: string;
}

interface Vehicle {
  id: number;
  name?: string;
  licensePlate: string;
  vehicleTypeId?: number;
  color: string;
  brand: string;
}

interface ViolationDetail {
  id: number;
  violationId: number;
  violationTypeId: number;
  violationType: ViolationType;
  imageUrl: string | null;
  videoUrl: string | null;
  location: string;
  violationTime: string;
  speed: number | null;
  additionalNotes: string | null;
  createdAt: string;
}

interface Violation {
  id: number;
  camera: Camera | null;
  vehicleType: VehicleType | null;
  vehicle: Vehicle | null;
  createdAt: string;
  violationDetails: ViolationDetail[] | null;
  status: string;
}

export default function ViolationDetail() {
  const { id } = useParams<{ id: string }>();
  const [violation, setViolation] = useState<Violation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [formData, setFormData] = useState<Partial<Pick<Violation, 'status'>>>({ status: '' });
  const [detailFormData, setDetailFormData] = useState<Partial<ViolationDetail>>({});
  const [imageExpanded, setImageExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);


  useEffect(() => {
    if (!id || isNaN(Number(id))) {
      setError("Invalid violation ID.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL_BE}/api/violations/${id}`);
        setViolation(response.data);
        setFormData({ status: response.data.status });
        const firstDetail = response.data.violationDetails?.[0] || {};
        setDetailFormData({
          violationType: firstDetail.violationType,
          imageUrl: firstDetail.imageUrl,
          videoUrl: firstDetail.videoUrl,
          location: firstDetail.location,
          violationTime: firstDetail.violationTime,
          speed: firstDetail.speed,
          additionalNotes: firstDetail.additionalNotes,
        });
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.response?.data?.message || "Unable to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ status: e.target.value });
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id) return;

    try {
      setLoading(true);
      let response;
      const statusUpper = newStatus.toUpperCase();

      switch (statusUpper) {
        case "PROCESSED":
          response = await axios.post(`${API_URL_BE}/api/violations/${id}/process`);
          break;
        case "APPROVED":
          response = await axios.post(`${API_URL_BE}/api/violations/${id}/approve`);
          break;
        case "REJECTED":
          response = await axios.post(`${API_URL_BE}/api/violations/${id}/reject`);
          break;
        case "PENDING":
          response = await axios.put(`${API_URL_BE}/api/violations/${id}`, {
            id: Number(id),
            camera: violation?.camera ? { id: violation.camera.id } : null,
            vehicleType: violation?.vehicleType ? { id: violation.vehicleType.id } : null,
            vehicle: violation?.vehicle
              ? {
                  id: violation.vehicle.id,
                  name: violation.vehicle.name,
                  licensePlate: violation.vehicle.licensePlate,
                  vehicleTypeId: violation.vehicle.vehicleTypeId,
                  color: violation.vehicle.color,
                  brand: violation.vehicle.brand,
                }
              : null,
            status: "PENDING",
          });
          break;
        default:
          throw new Error("Invalid status");
      }

      setViolation(response.data);
      setFormData({ status: response.data.status });
      if (statusUpper === "APPROVED") {
        toast.success("Violation approved! An email with the violation report has been sent.");
      } else {
        toast.success(`Violation status updated to ${statusUpper}!`);
      }
    } catch (err: any) {
      console.error("Error updating status:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.errors?.join(", ") ||
        "Unable to update status. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDetail = async () => {
    if (!id || !detailFormData || !violation?.violationDetails?.[0]?.id) return;
    if (!detailFormData.violationType?.id) {
      toast.error("Violation Type is required.");
      return;
    }

    try {
      setLoading(true);
      const updateData = {
        id: violation.violationDetails[0].id,
        violationType: detailFormData.violationType ? { id: detailFormData.violationType.id } : null,
        imageUrl: detailFormData.imageUrl || null,
        videoUrl: detailFormData.videoUrl || null,
        location: detailFormData.location || null,
        violationTime: detailFormData.violationTime || null,
        speed: detailFormData.speed || null,
        additionalNotes: detailFormData.additionalNotes || null,
      };
      const updatedDetail = await axios.put(
        `${API_URL_BE}/api/violations/details/${violation.violationDetails[0].id}`,
        updateData
      );
      setViolation((prev) => ({
        ...prev!,
        violationDetails: [updatedDetail.data, ...(prev?.violationDetails?.slice(1) || [])],
      }));
      setIsEditingDetail(false);
      toast.success("Violation detail updated successfully!");
    } catch (err: any) {
      console.error("Error updating violation detail:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.errors?.join(", ") ||
        "Unable to update violation detail. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDetailInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setDetailFormData((prev) => ({
      ...prev,
      [name]: name === "speed" ? (value ? Number(value) : null) : value,
    }));
  };

  const getSeverityBadge = (typeName: string) => {
    const severity = typeName.toLowerCase();
    if (severity.includes("severe") || severity.includes("dangerous")) {
      return "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30";
    } else if (severity.includes("speed") || severity.includes("over")) {
      return "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30";
    } else if (severity.includes("parking") || severity.includes("stop")) {
      return "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30";
    }
    return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30";
  };

  const getStatusColor = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string; icon: React.ReactNode } } = {
      pending: { bg: "bg-gray-100", text: "text-gray-500", icon: <div className="w-2 h-2 bg-gray-400 rounded-full" /> },
      // requested: { bg: "bg-yellow-100", text: "text-yellow-700", icon: <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" /> },
      approved: { bg: "bg-green-100", text: "text-green-700", icon: <CheckCircle2 className="text-green-500" size={14} /> },
      rejected: { bg: "bg-red-100", text: "text-red-700", icon: <XCircle className="text-red-500" size={14} /> },
      processed: { bg: "bg-teal-100", text: "text-teal-700", icon: <CheckCircle2 className="text-teal-500" size={14} /> }
      ,
    };
    return statusMap[status.toLowerCase()] || { bg: "bg-gray-100", text: "text-gray-500", icon: <div className="w-2 h-2 bg-gray-400 rounded-full" /> };
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await axios.get(`${API_URL_BE}/api/violations/${id}`);
      setViolation(response.data);
      setFormData({ status: response.data.status });
      const firstDetail = response.data.violationDetails?.[0] || {};
      setDetailFormData({
        violationType: firstDetail.violationType,
        imageUrl: firstDetail.imageUrl,
        videoUrl: firstDetail.videoUrl,
        location: firstDetail.location,
        violationTime: firstDetail.violationTime,
        speed: firstDetail.speed,
        additionalNotes: firstDetail.additionalNotes,
      });
      toast.success("Data refreshed successfully!");
    } catch (err: any) {
      console.error("Error refreshing data:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.errors?.join(", ") ||
        "Unable to refresh data. Please try again.";
      toast.error(errorMessage);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-100 via-gray-50 to-blue-100">
        <Sidebar />
        <div className="flex flex-col flex-grow overflow-hidden">
          <Header title="Violation Detail" />
          <div className="flex items-center justify-center flex-grow">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gradient-to-r from-blue-400 to-cyan-400 border-t-transparent"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 opacity-20 animate-pulse"></div>
              </div>
              <p className="text-blue-800 font-semibold bg-white/50 backdrop-blur-md px-6 py-3 rounded-full shadow-lg">
                Loading data...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-100 via-gray-50 to-blue-100">
        <Sidebar />
        <div className="flex flex-col flex-grow overflow-hidden">
          <Header title="Violation Detail" />
          <div className="flex items-center justify-center flex-grow">
            <div className="text-center p-8 bg-white/95 backdrop-blur-md rounded-2xl border border-blue-200 shadow-2xl shadow-blue-300/30">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center animate-pulse">
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-800 mb-3">An error occurred</h3>
              <p className="text-blue-600 mb-6">{error}</p>
              <Link
                to="/violations"
                className="inline-block px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/40"
              >
                Back to list
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!violation || !violation.violationDetails || violation.violationDetails.length === 0) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-100 via-gray-50 to-blue-100">
        <Sidebar />
        <div className="flex flex-col flex-grow overflow-hidden">
          <Header title="Violation Detail" />
          <div className="flex items-center justify-center flex-grow">
            <div className="text-center p-8 bg-white/95 backdrop-blur-md rounded-2xl border border-blue-200 shadow-2xl shadow-blue-300/30">
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
                    d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-800 mb-3">Not found</h3>
              <p className="text-blue-600 mb-6">This violation does not exist or has no details.</p>
              <Link
                to="/violations"
                className="inline-block px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/40"
              >
                Back to list
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-100 via-gray-50 to-blue-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Violation Detail" />
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
                      Violation #{violation.id}
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
                      {violation.createdAt
                        ? format(new Date(violation.createdAt), "dd/MM/yyyy 'at' HH:mm:ss")
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transform hover:scale-105 transition-all duration-300 ${getSeverityBadge(
                      violation.violationDetails[0].violationType?.typeName || ""
                    )}`}
                  >
                    {violation.violationDetails[0].violationType?.typeName || "Unclassified"}
                  </span>
                  <div className={`inline-flex items-center px-3 py-1 rounded-lg ${getStatusColor(violation.status).bg} ${getStatusColor(violation.status).text} font-medium`}>
                    {getStatusColor(violation.status).icon}
                    <span className="ml-2 capitalize">{violation.status || "Pending"}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/violations"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-200 to-blue-200 text-gray-800 rounded-xl hover:from-gray-300 hover:to-blue-300 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-400/30 relative overflow-hidden group"
                  aria-label="Back to violation list"
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
                </Link>
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
                {!isEditingDetail && (
                  <button
                    onClick={() => setIsEditingDetail(true)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/40 relative overflow-hidden group"
                    aria-label="Edit violation detail"
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
                )}
                {isEditingDetail && (
                  <div className="flex space-x-3">
                    <button
                      onClick={handleUpdateDetail}
                      disabled={loading}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                      aria-label="Save changes"
                    >
                      <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                      {loading ? (
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : (
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
                      )}
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditingDetail(false)}
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
              </div>

              {/* Status Update Section */}
              <motion.div
                className="mt-6 bg-gradient-to-br from-white/95 to-blue-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  Update Violation Status 
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-blue-700 font-medium mb-1">Status:</label>
                    <select
                      name="status"
                      value={formData.status || ""}
                      onChange={handleStatusChange}
                      className="w-full border border-blue-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm transition-all duration-300"
                      disabled={loading}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PROCESSED">Processed</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                  <button
                    onClick={() => handleUpdateStatus(formData.status || "")}
                    disabled={loading || !formData.status}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                    aria-label="Update status"
                  >
                    <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                    {loading ? (
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
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
                    )}
                    Update Status
                  </button>
                </div>
              </motion.div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Media Section */}
              <div className="lg:col-span-2 space-y-6">
                {/* Image */}
                {violation.violationDetails[0].imageUrl ? (
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
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      Violation Image
                    </h3>
                    <div className="relative group">
                      <img
                        src={violation.violationDetails[0].imageUrl}
                        alt="Violation Image"
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
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <p className="font-medium text-gray-600">No image available</p>
                    </div>
                  </motion.div>
                )}

                {/* Video */}
                {violation.violationDetails[0].videoUrl ? (
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
      Violation Video
    </h3>
    <div className="relative group">
      <video
        src={violation.violationDetails[0].videoUrl}
        controls
        className="w-full rounded-xl border-2 border-blue-200/50 transition-all duration-300 group-hover:border-blue-400 group-hover:shadow-2xl group-hover:shadow-blue-400/40"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 transform scale-90 group-hover:scale-100 transition-all duration-300">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
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
              </div>

              {/* Details Section */}
              <div className="space-y-6">
                {/* Vehicle Information */}
                <motion.div 
                  className="bg-gradient-to-br from-white/95 to-blue-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50"
                  initial={{ opacity: 0, x: 20 }}
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
                          d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-9 1h10l2 14H6l2-14z"
                        />
                      </svg>
                    </div>
                    Vehicle Information
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 font-medium">Vehicle Type:</span>
                      <span className="font-semibold text-blue-900 bg-blue-100/80 px-3 py-1 rounded-xl">
                        {violation.vehicleType?.typeName || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 font-medium">Vehicle Name:</span>
                      <span className="font-semibold text-blue-900 bg-blue-100/80 px-3 py-1 rounded-xl">
                        {violation.vehicle?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 font-medium">License Plate:</span>
                      <span className="font-semibold text-blue-900 font-mono bg-blue-100/80 px-3 py-1 rounded-xl">
                        {violation.vehicle?.licensePlate || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 font-medium">Vehicle Color:</span>
                      <span className="font-semibold text-blue-900 bg-blue-100/80 px-3 py-1 rounded-xl">
                        {violation.vehicle?.color || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 font-medium">Vehicle Brand:</span>
                      <span className="font-semibold text-blue-900 bg-blue-100/80 px-3 py-1 rounded-xl">
                        {violation.vehicle?.brand || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 font-medium">Camera:</span>
                      <span className="font-semibold text-blue-900 bg-blue-100/80 px-3 py-1 rounded-xl">
                        {violation.camera?.name || "N/A"}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Violation Details */}
                <motion.div 
                  className="bg-gradient-to-br from-white/95 to-blue-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50"
                  initial={{ opacity: 0, x: 20 }}
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    Violation Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-blue-700 font-medium mb-1">
                        Violation Type:
                      </label>
                      
                        <span
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transform hover:scale-105 transition-all duration-300 ${getSeverityBadge(
                            violation.violationDetails[0].violationType?.typeName || ""
                          )}`}
                        >
                          {violation.violationDetails[0].violationType?.typeName || "N/A"}
                        </span>
                      
                    </div>
                    <div>
                      <label className="block text-blue-700 font-medium mb-1">
                        Violation Time:
                      </label>
                      {isEditingDetail ? (
                        <input
                          type="datetime-local"
                          name="violationTime"
                          value={detailFormData.violationTime?.slice(0, 16) || ""}
                          onChange={handleDetailInputChange}
                          className="w-full border border-blue-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm transition-all duration-300"
                        />
                      ) : (
                        <span className="font-semibold text-blue-900 bg-blue-100/80 px-3 py-1 rounded-xl flex items-center">
                          <svg
                            className="w-4 h-4 mr-2 text-blue-500"
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
                          {violation.violationDetails[0].violationTime
                            ? format(
                                new Date(violation.violationDetails[0].violationTime),
                                "dd/MM/yyyy HH:mm:ss"
                              )
                            : "N/A"}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-blue-700 font-medium mb-1">Speed:</label>
                      {isEditingDetail ? (
                        <div className="relative">
                          <input
                            type="number"
                            name="speed"
                            value={detailFormData.speed || ""}
                            onChange={handleDetailInputChange}
                            className="w-full border border-blue-300 rounded-xl px-4 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm transition-all duration-300"
                            placeholder="Enter speed"
                          />
                          <span className="absolute right-3 top-2 text-blue-600 font-medium">
                            km/h
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold text-blue-900">
                          {violation.violationDetails[0].speed ? (
                            <span className="inline-flex items-center bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 px-3 py-1 rounded-xl text-sm font-medium">
                              <svg
                                className="w-4 h-4 mr-2 text-blue-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                              </svg>
                              {violation.violationDetails[0].speed} km/h
                            </span>
                          ) : (
                            "N/A"
                          )}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-blue-700 font-medium mb-1">Location:</label>
                      {isEditingDetail ? (
                        <input
                          type="text"
                          name="location"
                          value={detailFormData.location || ""}
                          onChange={handleDetailInputChange}
                          className="w-full border border-blue-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm transition-all duration-300"
                          placeholder="Enter location"
                        />
                      ) : (
                        <span className="font-semibold text-blue-900 bg-blue-100/80 px-3 py-1 rounded-xl flex items-center">
                          <svg
                            className="w-4 h-4 mr-2 text-blue-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {violation.violationDetails[0].location || "N/A"}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Camera Information */}
                <motion.div 
                  className="bg-gradient-to-br from-white/95 to-blue-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
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
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    Camera Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-blue-700 font-medium mb-1">
                        Camera Name:
                      </label>
                      <span className="font-semibold text-blue-900 bg-blue-100/80 px-3 py-1 rounded-xl">
                        {violation.camera?.name || "N/A"}
                      </span>
                    </div>
                    <div>
                      <label className="block text-blue-700 font-medium mb-1">
                        Camera Location:
                      </label>
                      <span className="font-semibold text-blue-900 bg-blue-100/80 px-3 py-1 rounded-xl flex items-center">
                        <svg
                          className="w-4 h-4 mr-2 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {violation.camera?.location || "N/A"}
                      </span>
                    </div>
                    <div>
                      <label className="block text-blue-700 font-medium mb-1">
                        Camera Position:
                      </label>
                      {violation.camera?.latitude && violation.camera?.longitude ? (
                        <div className="h-48 rounded-xl overflow-hidden border border-blue-200/50 shadow-lg">
                          <MapContainer
                            center={[violation.camera.latitude, violation.camera.longitude]}
                            zoom={15}
                            style={{ height: "100%", width: "100%" }}
                            zoomControl={false}
                            dragging={false}
                            scrollWheelZoom={false}
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <Marker position={[violation.camera.latitude, violation.camera.longitude]}>
                              <Popup>
                                <span className="font-semibold">{violation.camera.name}</span>
                                <br />
                                {violation.camera.location}
                              </Popup>
                            </Marker>
                          </MapContainer>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 bg-blue-50/80 rounded-xl">
                          <svg
                            className="w-6 h-6 mx-auto mb-2 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <p className="font-medium">No coordinates available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Additional Notes */}
                {(isEditingDetail || violation.violationDetails[0].additionalNotes) && (
                  <motion.div 
                    className="bg-gradient-to-br from-white/95 to-blue-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </div>
                      Additional Notes
                    </h3>
                    {isEditingDetail ? (
                      <textarea
                        name="additionalNotes"
                        value={detailFormData.additionalNotes || ""}
                        onChange={handleDetailInputChange}
                        className="w-full border border-blue-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm transition-all duration-300"
                        placeholder="Enter additional notes..."
                        rows={4}
                      />
                    ) : (
                      <div className="bg-blue-50/80 backdrop-blur-sm rounded-xl p-4">
                        <p className="text-blue-700">
                          {violation.violationDetails[0].additionalNotes || "No additional notes"}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Image Expanded Modal */}
            {imageExpanded && violation.violationDetails[0].imageUrl && (
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
                    src={violation.violationDetails[0].imageUrl}
                    alt="Violation Image"
                    className="max-w-full max-h-full object-contain rounded-xl border-2 border-blue-200/50 shadow-2xl shadow-blue-400/40"
                    onClick={() => setImageExpanded(false)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
