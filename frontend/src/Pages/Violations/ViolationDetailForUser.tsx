"use client";

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Camera, 
  Car, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  Film, 
  Download,
  Gauge,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock3
} from "lucide-react";
import { format } from "date-fns";
import axios, { AxiosError } from "axios";
import jsPDF from "jspdf";
import API_URL_BE from "../../components/Link/LinkAPI";

// Define interfaces (keeping the same as original)
interface ViolationType {
  id: number;
  typeName: string;
  description?: string;
}

interface ViolationDetail {
  id: number;
  violationId?: number;
  violationTypeId?: number;
  violationType?: ViolationType;
  imageUrl?: string;
  videoUrl?: string;
  location?: string;
  violationTime?: string;
  speed?: number;
  additionalNotes?: string;
  createdAt?: string;
  licensePlate?: string;
}

interface ViolationsDTO {
  id: number;
  camera?: {
    id: number;
    name: string;
    location: string;
    streamUrl?: string;
    thumbnail?: string;
    zoneId?: number;
    latitude?: number;
    longitude?: number;
  };
  vehicleType?: {
    id: number;
    typeName: string;
  };
  vehicle?: {
    id: number;
    name?: string;
    licensePlate: string;
    userId?: number;
    vehicleTypeId?: number;
    color?: string;
    brand?: string;
  };
  createdAt?: string;
  violationDetails?: ViolationDetail[];
  status?: "Pending" | "Request" | "Approve" | "Reject" | "Processed";
}



const ViolationDetailForUser: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [violation, setViolation] = useState<ViolationsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchViolation = async () => {
      try {
        const response = await axios.get<ViolationsDTO>(
          `${API_URL_BE}/api/violations/${id}`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );
        setViolation(response.data);
        setLoading(false);
      } catch (err) {
        const error = err as AxiosError;
        console.error("Error fetching violation:", err);
        setError((error.response?.data as any)?.message || "Failed to load violation details.");
        setLoading(false);
      }
    };
    fetchViolation();
  }, [id]);

  const handleExportPDF = async () => {
    if (!violation) return;

    const doc = new jsPDF();
    const detail = violation.violationDetails?.[0] || {} as ViolationDetail;
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Violation Report", 105, y, { align: "center" });
    y += 10;
    doc.setFontSize(14);
    doc.text(`Violation ID: ${violation.id}`, 105, y, { align: "center" });
    y += 20;

    // Violation Details
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Violation Details", 20, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Violation Type: ${detail.violationType?.typeName || "N/A"}`, 20, y);
    y += 10;
    doc.text(`License Plate: ${violation.vehicle?.licensePlate || "N/A"}`, 20, y);
    y += 10;
    doc.text(`Vehicle: ${violation.vehicle?.brand || "N/A"} (${violation.vehicle?.color || "N/A"})`, 20, y);
    y += 10;
    doc.text(`Time: ${detail.violationTime ? format(new Date(detail.violationTime), "dd/MM/yyyy HH:mm:ss") : "N/A"}`, 20, y);
    y += 10;
    doc.text(`Location: ${detail.location || "N/A"}`, 20, y);
    y += 10;
    doc.text(`Speed: ${detail.speed ? `${detail.speed} km/h` : "N/A"}`, 20, y);
    y += 10;
    doc.text(`Status: ${violation.status || "N/A"}`, 20, y);
    y += 10;
    doc.text(`Additional Notes: ${detail.additionalNotes || "N/A"}`, 20, y, { maxWidth: 170 });

    doc.save(`violation_${id}.pdf`);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss");
    } catch {
      return "N/A";
    }
  };

  const getStatusBadge = (status?: string) => {
    const configs = {
      "APPROVED": { color: "bg-green-500", icon: CheckCircle, text: "Approved" },
      "REJECTED": { color: "bg-red-500", icon: XCircle, text: "Rejected" },
      "PENDING": { color: "bg-yellow-500", icon: Clock3, text: "Pending" },
      "PROCESSED": { color: "bg-blue-500", icon: AlertCircle, text: "Processed" },
      default: { color: "bg-gray-500", icon: AlertCircle, text: "Unknown" }
    };
    
    const config = configs[status as keyof typeof configs] || configs.default;
    const IconComponent = config.icon;
    
    return (
      <div className={`${config.color} text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium`}>
        <IconComponent size={16} />
        {config.text}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate("/violations")}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Back to Violations
          </button>
        </div>
      </div>
    );
  }

  const detail = violation?.violationDetails?.[0] || {} as ViolationDetail;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/violations")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Violation Details</h1>
                <p className="text-gray-600">ID: #{id}</p>
              </div>
            </div>
            
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              <Download size={18} />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Single Column Layout */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-8">
          
          {/* Status Section */}
          <motion.div
            className="bg-white rounded-lg shadow-sm p-6 border"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Status</h2>
              {getStatusBadge(violation?.status)}
            </div>
          </motion.div>

          {/* Basic Information */}
          <motion.div
            className="bg-white rounded-lg shadow-sm p-6 border"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Violation Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Violation Type</label>
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800 font-medium">{detail.violationType?.typeName || "N/A"}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                    <Car className="w-5 h-5 text-gray-600" />
                    <span className="font-mono text-lg font-semibold">{violation?.vehicle?.licensePlate || "N/A"}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Info</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                    <Car className="w-5 h-5 text-gray-600" />
                    <span>{violation?.vehicle?.brand || "N/A"} - {violation?.vehicle?.color || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <span>{formatDate(detail.violationTime)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <span>{detail.location || "N/A"}</span>
                  </div>
                </div>

                {detail.speed && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Speed</label>
                    <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <Gauge className="w-5 h-5 text-orange-600" />
                      <span className="text-orange-800 font-semibold text-lg">{detail.speed} km/h</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Media Section */}
          <motion.div
            className="bg-white rounded-lg shadow-sm p-6 border"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Evidence</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Image */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Photo Evidence</span>
                </div>
                {detail.imageUrl ? (
                  <img
                    src={detail.imageUrl}
                    alt="Violation Evidence"
                    className="w-full rounded-lg border shadow-sm"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No image available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Video */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Film className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Video Evidence</span>
                </div>
                {detail.videoUrl ? (
                  <video
                    src={detail.videoUrl}
                    controls
                    className="w-full rounded-lg border shadow-sm"
                    style={{ maxHeight: '300px' }}
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <Film className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No video available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Additional Notes */}
          {detail.additionalNotes && (
            <motion.div
              className="bg-white rounded-lg shadow-sm p-6 border"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Additional Notes</h2>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-gray-700 leading-relaxed">{detail.additionalNotes}</p>
              </div>
            </motion.div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default ViolationDetailForUser;
