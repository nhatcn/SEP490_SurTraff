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
  Gauge,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock3
} from "lucide-react";
import { format } from "date-fns";
import axios, { AxiosError } from "axios";
import Footer from "../../components/Layout/Footer";
import { Header, MobileDropdownMenu } from "../../components/Layout/Menu";
import logoImage from "../../asset/logo/screenshot_1749087176-removebg-preview.png";


// Extend jsPDF types to include jsPDF-autotable properties
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: {
      finalY?: number;
    };
    autoTable: (options: any) => jsPDF;
  }
}

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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

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

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate loading progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Dynamic imports for better performance
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      setExportProgress(20);

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      setExportProgress(30);

      // Enhanced styling
      const colors = {
        primary: [34, 197, 94], // Green-500
        secondary: [16, 185, 129], // Emerald-500
        accent: [6, 182, 212], // Cyan-500
        text: [31, 41, 55], // Gray-800
        lightText: [107, 114, 128], // Gray-500
        border: [209, 213, 219], // Gray-300
        background: [255, 255, 255], // White
      };

      const currentDate = new Intl.DateTimeFormat(navigator.language || "en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());

      const addWatermark = () => {
        doc.saveGraphicsState();
        doc.setGState(doc.GState({ opacity: 0.1 }));
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFontSize(60);
        doc.text("CONFIDENTIAL", 105, 150, { align: "center", angle: 45 });
        doc.restoreGraphicsState();
      };

      const addHeader = (pageNumber: number) => {
        // Header background
        doc.setFillColor(colors.background[0], colors.background[1], colors.background[2]);
        doc.rect(0, 0, 210, 45, "F");

        // Add logo with fallback
        try {
          doc.addImage(logoImage, "PNG", 15, 12, 25, 20);
        } catch (error) {
          console.warn("Logo image failed to load, using fallback text");
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          doc.setFontSize(12);
          doc.text("TVMS Logo", 15, 20);
        }

        // Title and system info
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("Violation Report", 50, 20);

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Traffic Violation Management System", 50, 28);

        doc.setFontSize(10);
        doc.text(`Generated: ${currentDate}`, 50, 35);

        // Page number
        doc.setFillColor(colors.background[0], colors.background[1], colors.background[2]);
        doc.roundedRect(170, 8, 25, 12, 2, 2, "F");
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Page ${pageNumber}`, 182.5, 16, { align: "center" });
      };

      const addFooter = (pageNumber: number, totalPages: number) => {
        // Footer line
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.setLineWidth(0.5);
        doc.line(15, 280, 195, 280);

        // Footer content
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("© 2025 Traffic Violation Management System", 15, 285);
        doc.text("Confidential - For Official Use Only", 15, 290);
        doc.text(`${pageNumber} of ${totalPages}`, 195, 285, { align: "right" });
        doc.text("support@traffic-system.com", 195, 290, { align: "right" });
      };

      // Prepare table data for single violation
      const detail: ViolationDetail = violation.violationDetails?.[0] || {
        id: 0,
        violationType: { id: 0, typeName: "N/A" },
        location: "N/A",
        speed: undefined,
        violationTime: undefined,
        additionalNotes: undefined,
        imageUrl: undefined,
        videoUrl: undefined,
      };
      const violationTime = detail.violationTime
        ? new Intl.DateTimeFormat(navigator.language || "en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(detail.violationTime))
        : "N/A";

      const tableData = [[
        violation.vehicle?.licensePlate || "N/A",
        detail.violationType?.typeName || "N/A",
        detail.location || "N/A",
        detail.speed ? `${detail.speed} km/h` : "N/A",
        violationTime,
        violation.status || "Pending",
      ]];

      // Summary box
      doc.setFillColor(colors.background[0], colors.background[1], colors.background[2]);
      doc.roundedRect(15, 50, 180, 25, 3, 3, "F");
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.roundedRect(15, 50, 180, 25, 3, 3, "S");

      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Violation Summary", 20, 58);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Violation ID: ${violation.id}`, 20, 65);
      doc.text(`Vehicle: ${violation.vehicle?.brand || "N/A"} (${violation.vehicle?.color || "N/A"})`, 20, 70);
      doc.text(`Status: ${violation.status || "N/A"}`, 120, 65);
      doc.text(`Generated: ${currentDate}`, 120, 70);

      setExportProgress(50);

      // Enhanced table
      autoTable(doc, {
        startY: 85,
        head: [
          [
            "License Plate",
            "Violation Type",
            "Location",
            "Speed",
            "Date & Time",
            "Status",
          ],
        ],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: colors.primary as [number, number, number],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 4,
          textColor: colors.text as [number, number, number],
          lineColor: colors.border as [number, number, number],
          lineWidth: 0.1,
        },
        alternateRowStyles: {
          fillColor: colors.background as [number, number, number],
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 30 },
          1: { cellWidth: 40 },
          2: { cellWidth: 45 },
          3: { halign: "center", cellWidth: 25 },
          4: { halign: "center", cellWidth: 30 },
          5: { halign: "center", cellWidth: 20 },
        },
        margin: { top: 85, left: 15, right: 15 },
        didDrawPage: (data) => {
          const pageNumber = doc.getNumberOfPages();
          const totalPages = 1; // Single violation, one page
          addHeader(pageNumber);
          addFooter(pageNumber, totalPages);
          addWatermark();
        },
        didParseCell: (data) => {
          // Highlight critical violations
          if (data.column.index === 5 && data.cell.text[0] === "Critical") {
            data.cell.styles.textColor = [220, 38, 38]; // Red-600
            data.cell.styles.fontStyle = "bold";
          }
        },
      });

      setExportProgress(80);

      // Add notes section
      const finalY = doc.lastAutoTable?.finalY || 85;
      if (finalY < 250 && detail.additionalNotes) {
        doc.setFillColor(colors.background[0], colors.background[1], colors.background[2]);
        doc.roundedRect(15, finalY + 10, 180, 30, 3, 3, "F");
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.roundedRect(15, finalY + 10, 180, 30, 3, 3, "S");

        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Additional Notes:", 20, finalY + 18);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(detail.additionalNotes, 20, finalY + 25, { maxWidth: 170 });
      }

      setExportProgress(100);

      // Generate filename with timestamp
      const filename = `violation_${id}_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:-]/g, "")}.pdf`;

      // Save the PDF
      doc.save(filename);

      // Success notification
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 500);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setIsExporting(false);
      setExportProgress(0);
      alert("Error generating PDF. Please try again.");
    }
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
      APPROVED: { color: "bg-green-500", icon: CheckCircle, text: "Approved" },
      REJECTED: { color: "bg-red-500", icon: XCircle, text: "Rejected" },
      PENDING: { color: "bg-yellow-500", icon: Clock3, text: "Pending" },
      PROCESSED: { color: "bg-blue-500", icon: AlertCircle, text: "Processed" },
      default: { color: "bg-gray-500", icon: AlertCircle, text: "Unknown" },
    };

    const config = configs[status as keyof typeof configs] || configs.default;
    const IconComponent = config.icon;

    return (
      <div
        className={`${config.color} text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium`}
      >
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

  // Define detail with proper typing and fallback
  const detail: ViolationDetail = violation?.violationDetails?.[0] || {
    id: 0,
    violationType: { id: 0, typeName: "N/A" },
    location: "N/A",
    speed: undefined,
    violationTime: undefined,
    additionalNotes: undefined,
    imageUrl: undefined,
    videoUrl: undefined,
  };

  return (
    <div>
      <Header
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
      />
      <MobileDropdownMenu
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
      />
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
              <motion.button
                onClick={handleExportPDF}
                disabled={isExporting || !violation}
                className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: isExporting ? 1 : 1.02 }}
                whileTap={{ scale: isExporting ? 1 : 0.98 }}
                aria-label={isExporting ? `Exporting PDF, progress ${exportProgress}%` : "Export violation as PDF"}
                aria-busy={isExporting}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex items-center space-x-3">
                  {isExporting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray="60"
                            strokeDashoffset="60"
                            opacity="0.3"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray="60"
                            strokeDashoffset={60 - exportProgress * 0.6}
                            className="transition-all duration-300"
                          />
                        </svg>
                      </motion.div>
                      <span>Exporting... {exportProgress}%</span>
                    </>
                  ) : (
                    <>
                      <motion.svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        whileHover={{ y: -1 }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </motion.svg>
                      <span>Export PDF</span>
                    </>
                  )}
                </div>
                {isExporting && (
                  <motion.div
                    className="absolute bottom-0 left-0 h-1 bg-white bg-opacity-30 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${exportProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.button>
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
                      style={{ maxHeight: "300px" }}
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
      <Footer />
    </div>
  );
};

export default ViolationDetailForUser;
