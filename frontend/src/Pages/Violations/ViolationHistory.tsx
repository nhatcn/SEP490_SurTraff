"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Camera, Clock, Calendar, AlertTriangle, Car, ArrowLeft } from "lucide-react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import axios, { AxiosError } from "axios";

// Define interfaces
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
  violationDetails?: Array<{
    id: number;
    violationId?: number;
    violationTypeId?: number;
    violationType: {
      id: number;
      typeName: string;
      description?: string;
    };
    imageUrl?: string;
    videoUrl?: string;
    location?: string;
    violationTime?: string;
    speed?: number;
    additionalNotes?: string;
    createdAt?: string;
    licensePlate?: string;
  }>;
  status?: "Request" | "Approve" | "Reject" | "Pending";
}

interface VehicleDTO {
  id: number;
  name: string;
  licensePlate: string;
  userId: number;
  vehicleTypeId: number;
  color: string;
  brand: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface ViolationType {
  id: number;
  typeName: string;
  description?: string;
}

interface RequestButtonProps {
  violationId: number;
  onStatusUpdate: (updatedViolation: ViolationsDTO) => void;
}

const API_URL = "http://localhost:8081";
const ITEMS_PER_PAGE = 10;

// RequestButton Component
const RequestButton: React.FC<RequestButtonProps> = ({ violationId, onStatusUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [violationStatus, setViolationStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchViolationStatus = async () => {
      try {
        const response = await axios.get<ViolationsDTO>(
          `${API_URL}/api/violations/${violationId}`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );
        setViolationStatus(response.data.status?.toUpperCase() || null);
      } catch (err) {
        console.error("Error fetching violation status:", err);
        setViolationStatus(null);
      }
    };
    fetchViolationStatus();
  }, [violationId]);

  useEffect(() => {
    if (success !== null || error !== null) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleRequest = async () => {
    setIsLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const response = await axios.patch<ViolationsDTO>(
        `${API_URL}/api/violations/${violationId}/status`,
        null,
        {
          params: {
            status: "REQUEST",
          },
          headers: {
            Accept: "application/json",
          },
        }
      );
      onStatusUpdate(response.data);
      setViolationStatus(response.data.status?.toUpperCase() || "REQUEST");
      setSuccess(true);
    } catch (err) {
      const error = err as AxiosError;
      console.error("Error details:", {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
        request: {
          url: error.config?.url,
          params: error.config?.params,
          headers: error.config?.headers,
        },
      });
      if (error.response?.status === 404) {
        setError((error.response?.data as any)?.message || "Violation not found.");
      } else if (error.response?.status === 400) {
        setError(
          (error.response?.data as any)?.message ||
            "Invalid status. Valid statuses: PENDING, REQUEST, RESOLVED, DISMISSED."
        );
      } else {
        setError((error.response?.data as any)?.message || "An error occurred. Please try again.");
      }
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const isRequested = violationStatus === "REQUEST";
  const buttonText = isLoading
    ? "Processing..."
    : success === true
    ? "Success"
    : success === false
    ? "Failed"
    : isRequested
    ? "Requested"
    : "Send Request";

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleRequest}
        disabled={isLoading || isRequested}
        className={`
          relative px-6 py-3 rounded-lg font-semibold text-white 
          ${success === true ? "bg-green-600 hover:bg-green-700" : 
            success === false ? "bg-red-600 hover:bg-red-700" : 
            isRequested ? "bg-gray-600 hover:bg-gray-700" : 
            "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"}
          transition-all duration-300 ease-in-out
          transform hover:scale-105 hover:shadow-xl
          disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed
          ${isLoading ? "animate-pulse" : ""}
        `}
      >
        {isLoading ? (
          <span className="flex items-center">
            <svg
              className="animate-spin h-5 w-5 mr-2 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {buttonText}
          </span>
        ) : (
          buttonText
        )}
      </button>
      {error && (
        <motion.p
          className="text-red-400 text-sm mt-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

// LoadingSpinner Component
const LoadingSpinner: React.FC = () => (
  <motion.div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100%",
      padding: "2rem",
    }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    <motion.div
      style={{
        width: "0.5rem",
        height: "0.5rem",
        backgroundColor: "#3B82F6",
        borderRadius: "50%",
        marginRight: "0.5rem",
      }}
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0 }}
    />
    <motion.div
      style={{
        width: "0.5rem",
        height: "0.5rem",
        backgroundColor: "#3B82F6",
        borderRadius: "50%",
        marginRight: "0.5rem",
      }}
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.2 }}
    />
    <motion.div
      style={{
        width: "0.5rem",
        height: "0.5rem",
        backgroundColor: "#3B82F6",
        borderRadius: "50%",
      }}
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.4 }}
    />
  </motion.div>
);

// ErrorMessage Component
const ErrorMessage: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <motion.div
    style={{
      textAlign: "center",
      background: "linear-gradient(to right, #FEF2F2, #FFF1F2)",
      padding: "1.5rem",
      borderRadius: "1rem",
      border: "1px solid #FECACA",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "1rem" }}
    >
      <AlertTriangle style={{ color: "#EF4444", width: "1.25rem", height: "1.25rem" }} />
      <p style={{ color: "#B91C1C", fontSize: "0.875rem", fontWeight: 500 }}>{message}</p>
    </div>
    {onRetry && (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onRetry}
        style={{
          padding: "0.5rem 1rem",
          background: "linear-gradient(to right, #EF4444, #DC2626)",
          color: "white",
          borderRadius: "0.75rem",
          fontWeight: 600,
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          transition: "all 0.3s ease",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to right, #DC2626, #B91C1C)",
            opacity: 0,
            transition: "opacity 0.3s ease",
          }}
          className="hover:opacity-100"
        />
        <span style={{ position: "relative", zIndex: 10 }}>Retry</span>
      </motion.button>
    )}
  </motion.div>
);

// EmptyState Component
const EmptyState: React.FC = () => (
  <motion.div
    style={{
      textAlign: "center",
      padding: "3rem 0",
      color: "#6B7280",
    }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Camera style={{ color: "#9CA3AF", width: "3rem", height: "3rem", margin: "0 auto 1rem" }} />
    <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", marginBottom: "0.5rem" }}>
      No Violations Found
    </h3>
    <p style={{ color: "#6B7280", fontSize: "0.875rem" }}>The list of violations will appear here.</p>
  </motion.div>
);

// Pagination Component
const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const getPageNumbers = () => {
    const pages = [];
    const showPages = 5;
    let start = Math.max(1, currentPage - Math.floor(showPages / 2));
    const end = Math.min(totalPages, start + showPages - 1);
    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };
  return (
    <motion.div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.75rem 1rem",
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        borderTop: "1px solid rgba(229, 231, 235, 0.7)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: "0.5rem 0.75rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#374151",
            backgroundColor: "white",
            border: "2px solid #E5E7EB",
            borderRadius: "0.75rem",
            opacity: currentPage === 1 ? 0.5 : 1,
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
          }}
        >
          Previous
        </motion.button>
        {getPageNumbers().map((page) => (
          <motion.button
            key={page}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPageChange(page)}
            style={{
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              borderRadius: "0.75rem",
              color: page === currentPage ? "white" : "#374151",
              background: page === currentPage ? "linear-gradient(to right, #3B82F6, #8B5CF6)" : "white",
              border: "2px solid #E5E7EB",
              transition: "all 0.3s ease",
            }}
          >
            {page}
          </motion.button>
        ))}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: "0.5rem 0.75rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#374151",
            backgroundColor: "white",
            border: "2px solid #E5E7EB",
            borderRadius: "0.75rem",
            opacity: currentPage === totalPages ? 0.5 : 1,
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
          }}
        >
          Next
        </motion.button>
      </div>
      <p style={{ fontSize: "0.875rem", color: "#6B7280" }}>
        Page {currentPage} of {totalPages}
      </p>
    </motion.div>
  );
};

// SearchAndFilter Component
const SearchAndFilter: React.FC<{
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onFilterChange: (value: string) => void;
  violationTypes: ViolationType[];
  selectedLicensePlate: string | null;
  onVehicleSelect: (licensePlate: string) => void;
  vehicles: VehicleDTO[];
}> = ({
  searchTerm,
  onSearchChange,
  filterType,
  onFilterChange,
  violationTypes,
  selectedLicensePlate,
  onVehicleSelect,
  vehicles,
}) => {
  return (
    <motion.div
      style={{
        marginBottom: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        alignItems: "flex-start",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ flex: 1, width: "100%" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#374151",
            marginBottom: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Search style={{ width: "1rem", height: "1rem", color: "#3B82F6" }} />
            <span>Search License Plate</span>
          </div>
        </label>
        <div style={{ position: "relative" }}>
          <Search
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9CA3AF",
              width: "1rem",
              height: "1rem",
            }}
          />
          <input
            type="text"
            placeholder="Search by license plate..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 1rem 0.75rem 2.5rem",
              border: "2px solid #E5E7EB",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              backgroundColor: "rgba(243, 244, 246, 0.5)",
              transition: "all 0.3s ease",
              fontFamily: "monospace",
              outline: "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#3B82F6";
              e.target.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#E5E7EB";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: "12rem" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#374151",
            marginBottom: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle style={{ width: "1rem", height: "1rem", color: "#F59E0B" }} />
            <span>Violation Type</span>
          </div>
        </label>
        <select
          value={filterType}
          onChange={(e) => onFilterChange(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            border: "2px solid #E5E7EB",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            backgroundColor: "rgba(243, 244, 246, 0.7)",
            transition: "all 0.3s ease",
            outline: "none",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#F59E0B";
            e.target.style.boxShadow = "0 0 0 4px rgba(245, 158, 11, 0.2)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#E5E7EB";
            e.target.style.boxShadow = "none";
          }}
        >
          <option value="">All Violation Types</option>
          {violationTypes.map((type) => (
            <option key={type.id} value={type.typeName}>
              {type.typeName}
            </option>
          ))}
        </select>
      </div>
      <div style={{ width: "100%", maxWidth: "12rem" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#374151",
            marginBottom: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Car style={{ width: "1rem", height: "1rem", color: "#6366F1" }} />
            <span>Select Vehicle</span>
          </div>
        </label>
        <select
          value={selectedLicensePlate || ""}
          onChange={(e) => onVehicleSelect(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            border: "2px solid #E5E7EB",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            backgroundColor: "rgba(243, 244, 246, 0.7)",
            transition: "all 0.3s ease",
            outline: "none",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#6366F1";
            e.target.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.2)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#E5E7EB";
            e.target.style.boxShadow = "none";
          }}
        >
          <option value="">Select a vehicle</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.licensePlate}>
              {vehicle.name} ({vehicle.licensePlate})
            </option>
          ))}
        </select>
      </div>
    </motion.div>
  );
};

// ViolationRow Component
const ViolationRow: React.FC<{
  violation: ViolationsDTO;
  onStatusUpdate: (violationId: number, newStatus: "Approve" | "Reject" | "Request") => void;
}> = React.memo(({ violation, onStatusUpdate }) => {
  const detail = violation.violationDetails?.[0] || null;

  const getStatusColor = (status: string | null | undefined) => {
    const statusMap: { [key: string]: { bg: string; text: string; icon: React.ReactNode } } = {
      Pending: {
        bg: "bg-gray-100",
        text: "text-gray-500",
        icon: <div style={{ width: "0.5rem", height: "0.5rem", backgroundColor: "#9CA3AF", borderRadius: "50%" }} />,
      },
      Request: {
        bg: "bg-yellow-100",
        text: "text-yellow-700",
        icon: (
          <div
            style={{
              width: "0.5rem",
              height: "0.5rem",
              backgroundColor: "#F59E0B",
              borderRadius: "50%",
              animation: "pulse 2s infinite",
            }}
          />
        ),
      },
      Approve: {
        bg: "bg-green-100",
        text: "text-green-700",
        icon: <div style={{ width: "0.5rem", height: "0.5rem", backgroundColor: "#10B981", borderRadius: "50%" }} />,
      },
      Reject: {
        bg: "bg-red-100",
        text: "text-red-700",
        icon: <div style={{ width: "0.5rem", height: "0.5rem", backgroundColor: "#EF4444", borderRadius: "50%" }} />,
      },
    };
    return (
      statusMap[status || "Pending"] || {
        bg: "bg-gray-100",
        text: "text-gray-500",
        icon: <div style={{ width: "0.5rem", height: "0.5rem", backgroundColor: "#9CA3AF", borderRadius: "50%" }} />,
      }
    );
  };

  const formatDate = useCallback((dateString: string | null | undefined) => {
    if (!dateString) return <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>N/A</span>;
    try {
      const date = new Date(dateString);
      const isToday = date.toDateString() === new Date().toDateString();
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ padding: "0.25rem", backgroundColor: "#EDE9FE", borderRadius: "0.5rem" }}>
              <Clock style={{ width: "0.875rem", height: "0.875rem", color: "#8B5CF6" }} />
            </div>
            <span
              style={{
                fontWeight: 700,
                color: "#6D28D9",
                backgroundColor: "#F5F3FF",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.5rem",
              }}
            >
              {format(new Date(dateString), "HH:mm:ss")}
            </span>
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              color: isToday ? "#059669" : "#6B7280",
              fontWeight: isToday ? 600 : 400,
            }}
          >
            <Calendar style={{ width: "0.75rem", height: "0.75rem" }} />
            <span>{format(new Date(dateString), "dd/MM/yyyy")}</span>
            {isToday && (
              <span
                style={{
                  marginLeft: "0.5rem",
                  fontSize: "0.75rem",
                  background: "linear-gradient(to right, #10B981, #059669)",
                  color: "white",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "9999px",
                  animation: "pulse 2s infinite",
                }}
              >
                Today
              </span>
            )}
          </div>
        </div>
      );
    } catch {
      return <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>N/A</span>;
    }
  }, []);

  const handleStatusUpdateFromButton = (updatedViolation: ViolationsDTO) => {
    onStatusUpdate(violation.id, updatedViolation.status as "Approve" | "Reject" | "Request");
  };

  return (
    <motion.tr
      style={{
        borderTop: "1px solid #E5E7EB",
        transition: "background-color 0.2s ease",
      }}
      className="hover:bg-gray-50"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <td style={{ padding: "0.75rem" }}>
        <div style={{ position: "relative" }}>
          {detail?.imageUrl ? (
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "0.75rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                background: "linear-gradient(to bottom right, #F9FAFB, #E5E7EB)",
                transition: "all 0.3s ease",
              }}
              className="group"
            >
              <img
                src={detail.imageUrl || "/placeholder.svg"}
                alt="Violation"
                style={{
                  height: "4rem",
                  width: "6rem",
                  objectFit: "cover",
                  transition: "transform 0.3s ease",
                }}
                className="group-hover:scale-110"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.nextElementSibling?.classList.remove("hidden");
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.3), transparent)",
                  opacity: 0,
                  transition: "opacity 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                className="group-hover:opacity-100"
              >
                <div style={{ backgroundColor: "rgba(255,255,255,0.9)", borderRadius: "9999px", padding: "0.5rem" }}>
                  <Camera style={{ color: "#374151", width: "1rem", height: "1rem" }} />
                </div>
              </div>
              <div
                style={{
                  display: "none",
                  height: "4rem",
                  width: "6rem",
                  background: "linear-gradient(to bottom right, #F3F4F6, #E5E7EB)",
                  borderRadius: "0.75rem",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                className="hidden"
              >
                <Camera style={{ color: "#9CA3AF", width: "1.25rem", height: "1.25rem" }} />
              </div>
            </div>
          ) : (
            <div
              style={{
                height: "4rem",
                width: "6rem",
                background: "linear-gradient(to bottom right, #F3F4F6, #E5E7EB)",
                borderRadius: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                transition: "all 0.3s ease",
              }}
              className="group"
            >
              <Camera
                style={{
                  color: "#9CA3AF",
                  width: "1.25rem",
                  height: "1.25rem",
                  transition: "color 0.3s ease",
                }}
                className="group-hover:text-gray-500"
              />
            </div>
          )}
        </div>
      </td>
      <td style={{ padding: "0.75rem" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.5rem 1rem",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            background: "linear-gradient(to right, rgba(59,130,246,0.1), rgba(139,92,246,0.1))",
            color: "#3B82F6",
            border: "1px solid #BFDBFE",
            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              width: "0.5rem",
              height: "0.5rem",
              backgroundColor: "#3B82F6",
              borderRadius: "50%",
              marginRight: "0.5rem",
              animation: "pulse 2s infinite",
            }}
          />
          {detail?.violationType?.typeName || "Not Specified"}
        </span>
        {detail?.speed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "0.875rem",
              color: "#B91C1C",
              fontWeight: 500,
              backgroundColor: "#FEF2F2",
              padding: "0.25rem 0.75rem",
              borderRadius: "0.5rem",
              marginTop: "0.5rem",
            }}
          >
            <span style={{ marginRight: "0.25rem" }}>🚀</span>
            {detail.speed} km/h
          </div>
        )}
      </td>
      <td style={{ padding: "0.75rem" }}>
        <div className="group">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <div style={{ padding: "0.25rem", backgroundColor: "#D1FAE5", borderRadius: "0.5rem" }}>
              <Car style={{ width: "0.875rem", height: "0.875rem", color: "#059669" }} />
            </div>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "#1F2937",
                background: "linear-gradient(to right, #D1FAE5, #A7F3D0)",
                padding: "0.25rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #6EE7B7",
                transition: "color 0.2s ease",
              }}
              className="group-hover:text-green-600"
            >
              {violation.vehicle?.licensePlate || "N/A"}
            </span>
          </div>
          {violation.vehicle?.brand && (
            <div
              style={{
                fontSize: "0.875rem",
                color: "#6B7280",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                backgroundColor: "#F3F4F6",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.5rem",
              }}
            >
              <span style={{ fontWeight: 500 }}>{violation.vehicle.brand}</span>
              {violation.vehicle.color && (
                <>
                  <span>•</span>
                  <span style={{ textTransform: "capitalize" }}>{violation.vehicle.color}</span>
                </>
              )}
            </div>
          )}
        </div>
      </td>
      <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6B7280" }}>
        {formatDate(detail?.violationTime)}
      </td>
      <td style={{ padding: "0.75rem" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.25rem 0.75rem",
            borderRadius: "0.5rem",
            fontWeight: 500,
          }}
        >
          {(() => {
            const { bg, text, icon } = getStatusColor(violation.status);
            return (
              <div
                className={`${bg} ${text}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "0.5rem",
                }}
              >
                {icon}
                <span style={{ marginLeft: "0.5rem", textTransform: "capitalize" }}>
                  {violation.status || "Pending"}
                </span>
              </div>
            );
          })()}
        </div>
      </td>
      <td style={{ padding: "0.75rem" }}>
        <RequestButton violationId={violation.id} onStatusUpdate={handleStatusUpdateFromButton} />
      </td>
    </motion.tr>
  );
});

ViolationRow.displayName = "ViolationRow";

// ViolationHistory Component
export default function ViolationHistory() {
  const { plate } = useParams<{ plate: string }>();
  const navigate = useNavigate();
  const [violations, setViolations] = useState<ViolationsDTO[]>([]);
  const [allVehicles, setAllVehicles] = useState<VehicleDTO[]>([]);
  const [selectedLicensePlate, setSelectedLicensePlate] = useState<string | null>(plate || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const violationTypes = useMemo(() => {
    const types = new Map<string, ViolationType>();
    violations.forEach((violation) => {
      violation.violationDetails?.forEach((detail) => {
        if (detail?.violationType) {
          types.set(detail.violationType.typeName, detail.violationType);
        }
      });
    });
    return Array.from(types.values());
  }, [violations]);

  const filteredViolations = useMemo(() => {
    return violations.filter((violation) => {
      const matchesSearch =
        !searchTerm || violation.vehicle?.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        !filterType || violation.violationDetails?.some((detail) => detail?.violationType?.typeName === filterType);
      return matchesSearch && matchesFilter;
    });
  }, [violations, searchTerm, filterType]);

  const paginationInfo = useMemo((): PaginationInfo => {
    const totalItems = filteredViolations.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    return {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage: ITEMS_PER_PAGE,
    };
  }, [filteredViolations.length, currentPage]);

  const paginatedViolations = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredViolations.slice(startIndex, endIndex);
  }, [filteredViolations, currentPage]);

  const loadAllVehicles = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/vehicle/user/3`);
      if (!response.ok) {
        throw new Error("Failed to load vehicles.");
      }
      const data: VehicleDTO[] = await response.json();
      setAllVehicles(data);
      if (!selectedLicensePlate && data.length > 0) {
        setSelectedLicensePlate(data[0].licensePlate);
      }
    } catch (err: any) {
      console.error("Error loading vehicles:", err);
      setError(err.message || "Failed to load vehicles for selection.");
    }
  }, [selectedLicensePlate]);

  const loadViolations = useCallback(async () => {
    if (!selectedLicensePlate) {
      setViolations([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/violations/history/${selectedLicensePlate}`);
      if (!response.ok) {
        if (response.status === 404) {
          setViolations([]);
          setError("No violations found for this vehicle.");
        } else {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
      } else {
        const data = await response.json();
        const violationsArray = Array.isArray(data) ? data : [data].filter(Boolean);
        setViolations(
          violationsArray.map((item: any) => ({
            ...item,
            violationDetails: item.violationDetails || [],
          }))
        );
      }
    } catch (err: any) {
      console.error("API Error:", err);
      setError(err.message || "Failed to load violations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedLicensePlate, refreshKey]);

  useEffect(() => {
    loadAllVehicles();
  }, [loadAllVehicles]);

  useEffect(() => {
    loadViolations();
  }, [loadViolations, selectedLicensePlate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, selectedLicensePlate]);

  const handleStatusUpdate = useCallback((violationId: number, newStatus: "Approve" | "Reject" | "Request") => {
    setViolations((prev) => prev.map((v) => (v.id === violationId ? { ...v, status: newStatus } : v)));
  }, []);

  const handleRetry = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

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
            onClick={() => navigate("/vehiclelistuser")}
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
            Violation History - {selectedLicensePlate || "Select a Vehicle"}
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
              transition: "box-shadow 0.3s ease",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="hover:shadow-xl"
          >
            <div
              style={{
                marginBottom: "1.5rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <div style={{ fontSize: "0.875rem", color: "#6B7280" }}>
                Total: <span style={{ fontWeight: 600 }}>{filteredViolations.length}</span> violations
              </div>
            </div>
            <SearchAndFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterType={filterType}
              onFilterChange={setFilterType}
              violationTypes={violationTypes}
              selectedLicensePlate={selectedLicensePlate}
              onVehicleSelect={setSelectedLicensePlate}
              vehicles={allVehicles}
            />
            <AnimatePresence>
              {loading ? (
                <LoadingSpinner />
              ) : error ? (
                <ErrorMessage message={error} onRetry={handleRetry} />
              ) : filteredViolations.length === 0 ? (
                <EmptyState />
              ) : (
                <div
                  style={{
                    background: "rgba(255,255,255,0.8)",
                    borderRadius: "1rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    border: "1px solid rgba(229,231,235,0.7)",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ minWidth: "100%", borderCollapse: "collapse" }}>
                      <thead
                        style={{
                          background: "linear-gradient(to right, #3B82F6, #8B5CF6)",
                          color: "white",
                        }}
                      >
                        <tr>
                          <th
                            style={{
                              padding: "1rem 0.75rem",
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Image
                          </th>
                          <th
                            style={{
                              padding: "1rem 0.75rem",
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Violation Type
                          </th>
                          <th
                            style={{
                              padding: "1rem 0.75rem",
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            License Plate
                          </th>
                          <th
                            style={{
                              padding: "1rem 0.75rem",
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Time
                          </th>
                          <th
                            style={{
                              padding: "1rem 0.75rem",
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Status
                          </th>
                          <th
                            style={{
                              padding: "1rem 0.75rem",
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody style={{ background: "rgba(255,255,255,0.8)" }}>
                        {paginatedViolations.map((violation) => (
                          <ViolationRow key={violation.id} violation={violation} onStatusUpdate={handleStatusUpdate} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={paginationInfo.currentPage}
                    totalPages={paginationInfo.totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}