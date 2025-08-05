"use client";

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Car, Clock, Calendar, AlertTriangle, Film } from "lucide-react";
import { format } from "date-fns";
import axios, { AxiosError } from "axios";
import jsPDF from "jspdf";

// Define interfaces
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

const API_URL = "http://localhost:8081";

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
          `${API_URL}/api/violations/${id}`,
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
    y += doc.getTextDimensions(`Additional Notes: ${detail.additionalNotes || "N/A"}`, { maxWidth: 170 }).h + 10;

    // Image (if available and CORS-enabled)
    if (detail.imageUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = detail.imageUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => {
            console.warn("Image loading failed due to CORS or other issues.");
            resolve(null); // Continue without image
          };
        });
        doc.addImage(img, "JPEG", 20, y, 160, 90);
        y += 100;
        doc.text("Violation Image", 105, y, { align: "center" });
        y += 10;
      } catch (err) {
        console.warn("Failed to add image to PDF:", err);
        doc.text("Image not available (CORS or loading issue)", 20, y);
        y += 10;
      }
    }

    // Video URL (add as text, since jsPDF doesn't support embedding videos)
    if (detail.videoUrl) {
      doc.text(`Video URL: ${detail.videoUrl}`, 20, y, { maxWidth: 170 });
      y += doc.getTextDimensions(`Video URL: ${detail.videoUrl}`, { maxWidth: 170 }).h + 10;
    }

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg font-semibold">{error}</p>
          <button
            onClick={() => navigate("/violations")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Violations
          </button>
        </div>
      </div>
    );
  }

  const detail = violation?.violationDetails?.[0] || {} as ViolationDetail;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "linear-gradient(to bottom right, #F1F5F9, #DBEAFE, #E0E7FF)",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <motion.div
          style={{
            padding: "1rem 1.5rem",
            background: "linear-gradient(to right, #3B82F6, #8B5CF6)",
            color: "white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <button
            onClick={() => navigate("/violations")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: "0.75rem",
              color: "white",
              fontWeight: 500,
              transition: "background-color 0.3s ease",
              cursor: "pointer",
              border: "none",
            }}
            className="hover:bg-white/30"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            Violation Details - ID: {id}
          </h1>
        </motion.div>
        <div style={{ flexGrow: 1, padding: "1.5rem", overflowY: "auto" }}>
          <motion.div
            style={{
              maxWidth: "100%",
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(8px)",
              borderRadius: "1.5rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "2rem",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Violation Details</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExportPDF}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Export PDF
              </motion.button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                {/* Image Section */}
                {detail.imageUrl ? (
                  <img
                    src={detail.imageUrl}
                    alt="Violation"
                    className="w-full max-w-md rounded-lg shadow-md"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full max-w-md h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                    <Camera className="w-12 h-12 text-gray-400" />
                    <span className="ml-2 text-gray-600">No Image Available</span>
                  </div>
                )}
                {/* Video Section */}
                {detail.videoUrl ? (
                  <video
                    src={detail.videoUrl}
                    controls
                    className="w-full max-w-md rounded-lg shadow-md"
                  />
                ) : (
                  <div className="w-full max-w-md h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                    <Film className="w-12 h-12 text-gray-400" />
                    <span className="ml-2 text-gray-600">No Video Available</span>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <p>
                    <span className="font-semibold">Violation Type:</span>{" "}
                    {detail.violationType?.typeName || "N/A"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-green-600" />
                  <p>
                    <span className="font-semibold">License Plate:</span>{" "}
                    {violation?.vehicle?.licensePlate || "N/A"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-green-600" />
                  <p>
                    <span className="font-semibold">Vehicle:</span>{" "}
                    {violation?.vehicle?.brand || "N/A"} ({violation?.vehicle?.color || "N/A"})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <p>
                    <span className="font-semibold">Time:</span>{" "}
                    {formatDate(detail.violationTime)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <p>
                    <span className="font-semibold">Location:</span>{" "}
                    {detail.location || "N/A"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-600">🚀</span>
                  <p>
                    <span className="font-semibold">Speed:</span>{" "}
                    {detail.speed ? `${detail.speed} km/h` : "N/A"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p>
                    <span className="font-semibold">Status:</span>{" "}
                    {violation?.status || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Additional Notes:</p>
                  <p className="text-gray-600">{detail.additionalNotes || "N/A"}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ViolationDetailForUser;