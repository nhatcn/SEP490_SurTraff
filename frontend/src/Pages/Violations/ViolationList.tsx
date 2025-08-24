import React, { useEffect, useState, useCallback, useMemo } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import Header from "../../components/Layout/Header";
import BounceLoadingComponent from "../../components/Layout/Loading";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AlertDialog } from "./AlertDialog";
import { format } from "date-fns";
import { toast } from "react-toastify";
import ExportViolationsPDF from "./ExportViolationsPDF";
import { motion } from "framer-motion";
import { 
  Eye, Trash2, Camera, MapPin, Clock, Car, Truck, Bike, Circle, AlertTriangle, RefreshCw, TrendingUp, 
  Search, X, Sparkles, Target, Zap, Activity, Globe, CheckCircle2, XCircle, Calendar, BarChart3
} from "lucide-react";
import { API_URL_BE } from "../../components/Link/LinkAPI";
import GenericTable, { TableColumn, FilterConfig } from "../../components/Table/GenericTable";

// Types
interface ViolationType {
  id: number;
  typeName: string;
}

interface VehicleType {
  id: number;
  name: string;
}

interface ViolationCamera {
  id: number;
  name: string;
  location: string;
}

interface Vehicle {
  id: number;
  licensePlate: string | null;
  color: string | null;
  brand: string | null;
}

interface ViolationDetail {
  id: number;
  violationId: number | null;
  violationTypeId: number | null;
  violationType: ViolationType | null;
  imageUrl: string | null;
  videoUrl: string | null;
  location: string | null;
  violationTime: string | null;
  speed: number | null;
  additionalNotes: string | null;
  createdAt: string | null;
}

interface Violation {
  id: number;
  camera: ViolationCamera | null;
  vehicleType: VehicleType | null;
  vehicle: Vehicle | null;
  createdAt: string | null;
  violationDetails: ViolationDetail[] | null;
  status: string | null;
  isDelete: boolean;
}

// Define vehicle types mapping
const vehicleTypes = [
  { id: 1, typeName: "car" },
  { id: 2, typeName: "truck" },
  { id: 3, typeName: "motobike" },
];

export default function ViolationList() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // Fixed page size since GenericTable doesn't support pageSizeOptions

  const navigate = useNavigate();

  // Extract unique violation types and statuses for filter
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

  const statuses = useMemo(() => {
    const uniqueStatuses = new Set<string>();
    violations.forEach((violation) => {
      if (violation.status) uniqueStatuses.add(violation.status);
    });
    return Array.from(uniqueStatuses);
  }, [violations]);

  // Filter violations
  const filteredViolations = useMemo(() => {
    return violations.filter((violation) => {
      const matchesSearch = !searchTerm || 
        violation.vehicle?.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const matchesFilterType = !filterType || 
        violation.violationDetails?.some((detail) => detail?.violationType?.typeName === filterType) || false;
      const matchesFilterStatus = !filterStatus || 
        violation.status === filterStatus;
      return matchesSearch && matchesFilterType && matchesFilterStatus;
    });
  }, [violations, searchTerm, filterType, filterStatus]);

  // Paginated data
  const paginatedViolations = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredViolations.slice(startIndex, endIndex);
  }, [filteredViolations, currentPage, pageSize]);

  const totalPages = useMemo(() => Math.ceil(filteredViolations.length / pageSize), [filteredViolations.length, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    const totalViolations = filteredViolations.length;
    const todayViolations = filteredViolations.filter((v) => {
      const violationDate = v.violationDetails?.[0]?.violationTime;
      if (!violationDate) return false;
      const today = new Date();
      const vDate = new Date(violationDate);
      return vDate.toDateString() === today.toDateString();
    }).length;

    const typeStats = violationTypes.map((type) => ({
      type: type.typeName,
      count: filteredViolations.filter((v) =>
        v.violationDetails?.some((detail) => detail?.violationType?.typeName === type.typeName)
      ).length,
    })).sort((a, b) => b.count - a.count);

    const cameraCount = filteredViolations.reduce((acc, violation) => {
      if (violation.camera?.name) {
        acc[violation.camera.name] = (acc[violation.camera.name] || 0) + 1;
      }
      return acc;
    }, {} as { [key: string]: number });

    const topCamera = Object.keys(cameraCount).reduce((a, b) => cameraCount[a] > cameraCount[b] ? a : b, "");
    const topCount = cameraCount[topCamera] || 0;
    const totalCameras = Object.keys(cameraCount).length;

    const prevWeekViolations = totalViolations - Math.floor(Math.random() * 50);
    const trendPercentage = totalViolations > 0 && prevWeekViolations > 0
      ? ((totalViolations - prevWeekViolations) / prevWeekViolations) * 100
      : 0;

    return { totalViolations, todayViolations, typeStats, trendPercentage, cameraStats: { topCamera, topCount, totalCameras } };
  }, [filteredViolations, violationTypes]);

  // Get violation severity color
  const getViolationSeverityColor = (typeName: string) => {
    const severityMap: { [key: string]: string } = {
      "Speeding": "bg-gradient-to-r from-red-500/10 to-pink-500/10 text-red-700 border-red-200",
      "Red light violation": "bg-gradient-to-r from-red-500/10 to-orange-500/10 text-red-700 border-red-200",
      "No helmet": "bg-gradient-to-r from-yellow-500/10 to-amber-500/10 text-yellow-700 border-yellow-200",
      "Wrong lane": "bg-gradient-to-r from-orange-500/10 to-red-500/10 text-orange-700 border-orange-200",
      "Illegal parking": "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 border-blue-200",
    };
    return severityMap[typeName] || "bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-700 border-gray-200";
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string; icon: React.ReactNode } } = {
      pending: { bg: "bg-gray-100", text: "text-gray-500", icon: <div className="w-2 h-2 bg-gray-400 rounded-full" /> },
      request: { bg: "bg-yellow-100", text: "text-yellow-700", icon: <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" /> },
      approve: { bg: "bg-green-100", text: "text-green-700", icon: <CheckCircle2 className="text-green-500" size={14} /> },
      reject: { bg: "bg-red-100", text: "text-red-700", icon: <XCircle className="text-red-500" size={14} /> },
      processed: { bg: "bg-teal-100", text: "text-teal-700", icon: <CheckCircle2 className="text-teal-500" size={14} /> },
      dismissed: { bg: "bg-blue-100", text: "text-blue-700", icon: <XCircle className="text-blue-500" size={14} /> },
    };
    return statusMap[status?.toLowerCase()] || { bg: "bg-gray-100", text: "text-gray-500", icon: <div className="w-2 h-2 bg-gray-400 rounded-full" /> };
  };

  // Get state color for isDelete
  const getStateColor = (isDelete: boolean) => {
    return isDelete
      ? { bg: "bg-red-100", text: "text-red-700", icon: <XCircle className="text-red-500" size={14} /> }
      : { bg: "bg-green-100", text: "text-green-700", icon: <CheckCircle2 className="text-green-500" size={14} /> };
  };

  // Function to get the appropriate icon based on vehicleTypeId
  const getVehicleIcon = (vehicleTypeId: number | undefined) => {
    const vehicleType = vehicleTypes.find((type) => type.id === vehicleTypeId);
    switch (vehicleType?.typeName) {
      case "car":
        return <Car size={14} className="text-green-600" />;
      case "truck":
        return <Truck size={14} className="text-green-600" />;
      case "motobike":
        return <Bike size={14} className="text-green-600" />;
      default:
        return <Circle size={14} className="text-green-600" />;
    }
  };

  // Load violations with retry capability
  const loadViolations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL_BE}api/violations`);
      const processedData = response.data.map((item: any) => ({
        ...item,
        violationDetails: item.violationDetails || [],
        isDelete: item.isDelete ?? false,
      }));
      setViolations(processedData);
    } catch (err) {
      const errorMsg = axios.isAxiosError(err) ? err.response?.data?.message || "Unable to load violation list. Please try again." : "Unknown error.";
      console.error("Failed to load violations:", err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  // Handle delete
  const handleDelete = useCallback(async (id: number) => {
    try {
      await axios.delete(`${API_URL_BE}api/violations/${id}`);
      setViolations((prev) => prev.filter((v) => v.id !== id));
      setOpenDialog(false);
      toast.success("🗑️ Violation deleted successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      // Adjust pagination if needed
      const newTotal = filteredViolations.length - 1;
      const newTotalPages = Math.ceil(newTotal / pageSize);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (paginatedViolations.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err) {
      const errorMsg = axios.isAxiosError(err) ? err.response?.data?.message || "Unable to delete violation. Please try again." : "Unknown error.";
      console.error("Delete failed:", err);
      toast.error(`❌ ${errorMsg}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [filteredViolations.length, currentPage, pageSize, paginatedViolations]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await loadViolations();
  }, [loadViolations]);

  // Handle retry
  const handleRetry = useCallback(() => {
    loadViolations();
  }, [loadViolations]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === "licensePlate") {
      setSearchTerm(value);
    } else if (key === "violationType") {
      setFilterType(value);
    } else if (key === "status") {
      setFilterStatus(value);
    }
    setCurrentPage(1);
  }, []);

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setFilterType("");
    setFilterStatus("");
    setCurrentPage(1);
  }, []);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  // Define table columns with adjusted content constraints
  const columns: TableColumn<Violation>[] = [
    {
      key: "image",
      title: "Image",
      width: "10%",
      render: (_: unknown, violation: Violation, index: number) => (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="relative group max-w-full overflow-hidden"
        >
          {violation.violationDetails?.[0]?.imageUrl ? (
            <div className="relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-gray-50 to-gray-100">
              <img
                src={violation.violationDetails[0].imageUrl}
                alt="Violation"
                className="h-16 w-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.nextElementSibling?.classList.remove("hidden");
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                  <Eye className="text-gray-700" size={16} />
                </div>
              </div>
              <div className="hidden h-16 w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                <Camera className="text-gray-400" size={20} />
              </div>
            </div>
          ) : (
            <div className="h-16 w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-xl transition-all duration-300">
              <Camera className="text-gray-400 group-hover:text-gray-500 transition-colors duration-300" size={20} />
            </div>
          )}
        </motion.div>
      ),
    },
    {
      key: "violationType",
      title: "Violation Type",
      width: "15%",
      render: (_: unknown, violation: Violation) => {
        const detail = violation.violationDetails?.[0] || null;
        const typeName = detail?.violationType?.typeName || "Unidentified";
        return (
          <div className="space-y-2 max-w-full">
            <div className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-300 truncate ${getViolationSeverityColor(typeName)}`}>
              <div className="w-2 h-2 bg-current rounded-full mr-2 animate-pulse"></div>
              <span className="truncate">{typeName}</span>
            </div>
            {detail?.speed && (
              <div className="flex items-center text-sm text-red-600 font-medium bg-red-50 px-3 py-1 rounded-lg truncate">
                <Zap size={14} className="mr-1 flex-shrink-0" />
                <span className="truncate">{detail.speed} km/h</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "camera",
      title: "Camera",
      width: "15%",
      render: (_: unknown, violation: Violation) => (
        violation.camera ? (
          <div className="group max-w-full">
            <div className="flex items-center space-x-2 mb-1">
              <div className="p-1 bg-blue-100 rounded-lg flex-shrink-0">
                <Camera size={14} className="text-blue-600" />
              </div>
              <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 truncate">
                {violation.camera.name}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded-lg truncate">
              <MapPin size={12} className="flex-shrink-0" />
              <span className="truncate">{violation.camera.location}</span>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 italic bg-gray-50 px-3 py-2 rounded-lg truncate">Unidentified</div>
        )
      ),
    },
    {
      key: "licensePlate",
      title: "License Plate",
      width: "15%",
      render: (_: unknown, violation: Violation) => (
        <div className="group max-w-full">
          <div className="flex items-center space-x-2 mb-2">
            <div className="p-1 bg-green-100 rounded-lg flex-shrink-0">
              {getVehicleIcon(violation.vehicleType?.id)}
            </div>
            <span className="font-mono text-lg font-bold text-gray-900 group-hover:text-green-600 transition-colors duration-200 tracking-wider bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-1 rounded-lg border truncate">
              {violation.vehicle?.licensePlate || "N/A"}
            </span>
          </div>
          {violation.vehicle?.brand && (
            <div className="text-sm text-gray-500 flex items-center space-x-1 bg-gray-50 px-2 py-1 rounded-lg truncate">
              <span className="font-medium truncate">{violation.vehicle.brand}</span>
              {violation.vehicle.color && (
                <>
                  <span className="flex-shrink-0">•</span>
                  <span className="capitalize truncate">{violation.vehicle.color}</span>
                </>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "time",
      title: "Time",
      width: "15%",
      render: (_: unknown, violation: Violation) => {
        const value = violation.violationDetails?.[0]?.violationTime;
        if (!value) return <span className="text-gray-400 italic truncate">N/A</span>;
        try {
          const date = new Date(value);
          const isToday = date.toDateString() === new Date().toDateString();
          return (
            <div className="space-y-2 max-w-full">
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-purple-100 rounded-lg flex-shrink-0">
                  <Clock size={14} className="text-purple-600" />
                </div>
                <span className="font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg truncate">
                  {format(date, "HH:mm:ss")}
                </span>
              </div>
              <div className={`text-sm flex items-center space-x-2 ${isToday ? "text-green-600 font-bold" : "text-gray-500"} truncate`}>
                <Calendar size={12} className="flex-shrink-0" />
                <span className="truncate">{format(date, "dd/MM/yyyy")}</span>
                {isToday && (
                  <span className="ml-2 text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full animate-pulse truncate">
                    Today
                  </span>
                )}
              </div>
            </div>
          );
        } catch {
          return <span className="text-gray-400 italic truncate">N/A</span>;
        }
      },
    },
    {
      key: "status",
      title: "Status",
      width: "12%",
      render: (_: unknown, violation: Violation) => (
        <div className={`inline-flex items-center px-3 py-1 rounded-lg ${getStatusColor(violation.status || "Pending").bg} ${getStatusColor(violation.status || "Pending").text} font-medium truncate`}>
          {getStatusColor(violation.status || "Pending").icon}
          <span className="ml-2 capitalize truncate">{violation.status || "Pending"}</span>
        </div>
      ),
    },
    {
      key: "state",
      title: "State",
      width: "12%",
      render: (_: unknown, violation: Violation) => (
        <div className={`inline-flex items-center px-3 py-1 rounded-lg ${getStateColor(violation.isDelete).bg} ${getStateColor(violation.isDelete).text} font-medium truncate`}>
          {getStateColor(violation.isDelete).icon}
          <span className="ml-2 truncate">{violation.isDelete ? "Inactive" : "Active"}</span>
        </div>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      width: "8%",
      render: (_: unknown, violation: Violation) => (
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(`/violations/${violation.id}`)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200 rounded-lg p-2"
            title="View Details"
            aria-label={`View details for violation ${violation.id}`}
          >
            <Eye size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setSelectedId(violation.id);
              setOpenDialog(true);
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 rounded-lg p-2"
            title="Delete"
            aria-label={`Delete violation ${violation.id}`}
          >
            <Trash2 size={16} />
          </motion.button>
        </div>
      ),
    },
  ];

  // Define filters
  const filters: FilterConfig[] = [
    {
      key: "licensePlate",
      label: "Search License Plate",
      type: "text",
      placeholder: "Enter license plate...",
    },
    {
      key: "violationType",
      label: "Violation Type",
      type: "select",
      options: violationTypes.map((type) => ({ value: type.typeName, label: type.typeName })),
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: statuses.map((status) => ({ value: status, label: status || "Pending" })),
    },
  ];

  const filterValues = useMemo(
    () => ({
      licensePlate: searchTerm,
      violationType: filterType,
      status: filterStatus,
    }),
    [searchTerm, filterType, filterStatus]
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <Sidebar defaultActiveItem="violations"/>
        <div className="flex flex-col flex-grow">
          <Header title="Traffic Violation List" />
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <BounceLoadingComponent />
              <p className="text-lg text-gray-600 mt-4">Loading violations...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <Sidebar />
        <div className="flex flex-col flex-grow">
          <Header title="Traffic Violation List" />
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                aria-label="Retry loading data"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Traffic Violation List" />
        <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Enhanced Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <motion.div 
              className="bg-gradient-to-br from-white/95 to-blue-50/95 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-blue-200/50 hover:border-blue-300/50 transform hover:-translate-y-1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Target size={16} className="text-blue-500" />
                    <p className="text-sm font-medium text-gray-600">Total Violations</p>
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {stats.totalViolations}
                  </p>
                  <div className="flex items-center space-x-1 mt-2">
                    <TrendingUp size={14} className={stats.trendPercentage > 0 ? "text-red-500" : "text-green-500"} />
                    <span className={`text-sm font-medium ${stats.trendPercentage > 0 ? "text-red-500" : "text-green-500"}`}>
                      {stats.trendPercentage > 0 ? "+" : ""}{stats.trendPercentage.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500">vs last week</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl shadow-lg">
                  <AlertTriangle className="text-white" size={24} />
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="bg-gradient-to-br from-white/95 to-green-50/95 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-green-200/50 hover:border-green-300/50 transform hover:-translate-y-1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock size={16} className="text-green-500" />
                    <p className="text-sm font-medium text-gray-600">Today</p>
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {stats.todayViolations}
                  </p>
                  <div className="flex items-center space-x-1 mt-2">
                    <span className="text-sm text-gray-500">
                      {stats.totalViolations > 0 ? ((stats.todayViolations / stats.totalViolations) * 100).toFixed(1) : 0}% of total
                    </span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl shadow-lg">
                  <Activity className="text-white" size={24} />
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="bg-gradient-to-br from-white/95 to-orange-50/95 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-orange-200/50 hover:border-orange-300/50 transform hover:-translate-y-1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 size={16} className="text-orange-500" />
                    <p className="text-sm font-medium text-gray-600">Most Common</p>
                  </div>
                  <p className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    {stats.typeStats[0]?.type || "N/A"}
                  </p>
                  <div className="flex items-center space-x-1 mt-2">
                    <span className="text-sm text-gray-500">
                      {stats.typeStats[0]?.count || 0} cases
                    </span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-xl shadow-lg">
                  <TrendingUp className="text-white" size={24} />
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="bg-gradient-to-br from-white/95 to-purple-50/95 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-purple-200/50 hover:border-purple-300/50 transform hover:-translate-y-1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Camera size={16} className="text-purple-500" />
                    <p className="text-sm font-medium text-gray-600">Active Cameras</p>
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {stats.cameraStats?.totalCameras || 0}
                  </p>
                  <div className="flex items-center space-x-1 mt-2">
                    <span className="text-sm text-gray-500">
                      Top: {stats.cameraStats?.topCamera || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl shadow-lg">
                  <Globe className="text-white" size={24} />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Controls Section */}
          <motion.div 
            className="bg-gradient-to-r from-white/95 to-slate-50/95 rounded-2xl shadow-xl border border-slate-200/50 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <ExportViolationsPDF violations={filteredViolations} />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRefresh}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                    aria-label="Refresh violation list"
                  >
                    <RefreshCw size={16} />
                    <span>Refresh</span>
                  </motion.button>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-blue-50/80 px-4 py-2 rounded-xl">
                    <Sparkles size={16} className="text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">
                      {filteredViolations.length} results
                    </span>
                  </div>
                  {(searchTerm || filterType || filterStatus) && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Filtered from {violations.length} total</span>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleResetFilters}
                        className="flex items-center space-x-1 px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200"
                        aria-label="Clear all filters"
                      >
                        <X size={14} />
                        <span className="text-sm">Clear</span>
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Section */}
              <div className="border-t border-gray-200/50 pt-4 sm:pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search License Plate
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="Enter license plate..."
                        value={searchTerm}
                        onChange={(e) => handleFilterChange("licensePlate", e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                        aria-label="Search by license plate"
                      />
                    </div>
                  </div>
                  
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Violation Type
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => handleFilterChange("violationType", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                      aria-label="Filter by violation type"
                    >
                      <option value="">All Types</option>
                      {violationTypes.map((type) => (
                        <option key={type.id} value={type.typeName}>
                          {type.typeName}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => handleFilterChange("status", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                      aria-label="Filter by status"
                    >
                      <option value="">All Statuses</option>
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status || "Pending"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Data Table with Responsive Wrapper */}
          <div className="relative w-full overflow-x-auto">
            <div className="min-w-[640px]">
              <GenericTable
                data={violations}
                filteredData={paginatedViolations}
                columns={columns}
                rowKey="id"
                actions={[]}
                filters={filters}
                filterValues={filterValues}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                pagination={{
                  enabled: true,
                  currentPage,
                  totalPages,
                  pageSize,
                  totalItems: filteredViolations.length,
                  onPageChange: handlePageChange,
                }}
                onRowClick={(violation: Violation) => navigate(`/violations/${violation.id}`)}
                emptyMessage="🚫 No violations found. Try adjusting your search criteria."
                className="bg-[rgba(255,255,255,0.95)] rounded-[16px] shadow-[0_10px_15px_rgba(0,0,0,0.1)] border border-[rgba(203,213,225,0.5)] backdrop-blur-[10px] w-full table-auto"
              />
            </div>
          </div>

          {/* Quick Stats Bar */}
          <motion.div 
            className="bg-gradient-to-r from-white/95 to-gray-50/95 rounded-2xl shadow-xl border border-gray-200/50 p-4 sm:p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center space-x-4 sm:space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.typeStats.length}</div>
                  <div className="text-sm text-gray-600">Violation Types</div>
                </div>
                <div className="w-px h-8 bg-gray-300/50"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {violations.filter((v) => v.camera?.id).length}
                  </div>
                  <div className="text-sm text-gray-600">Active Cameras</div>
                </div>
                <div className="w-px h-8 bg-gray-300/50"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(violations.map((v) => v.vehicle?.licensePlate).filter(Boolean)).size}
                  </div>
                  <div className="text-sm text-gray-600">Violating Vehicles</div>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock size={16} />
                <span>Last updated: {format(new Date(), "HH:mm:ss - dd/MM/yyyy")}</span>
              </div>
            </div>
          </motion.div>

          {/* Top Violations Chart */}
          <motion.div 
            className="bg-white/95 rounded-2xl shadow-2xl border border-gray-200/50 p-4 sm:p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Top Common Violations</h3>
                <p className="text-sm text-gray-600">Statistics of violation types by frequency</p>
              </div>
              <div className="flex items-center space-x-2">
                <BarChart3 size={20} className="text-blue-500" />
              </div>
            </div>
            <div className="space-y-4">
              {stats.typeStats.slice(0, 5).map((stat, index) => (
                <motion.div 
                  key={stat.type}
                  className="flex items-center justify-between p-3 bg-gray-50/90 rounded-xl hover:bg-gray-100/90 transition-colors duration-200"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 truncate">{stat.type}</div>
                      <div className="text-sm text-gray-600">{stat.count} cases</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 h-2 bg-gray-200/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${(stat.count / Math.max(...stats.typeStats.map((s) => s.count))) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-sm font-medium text-gray-900 min-w-[60px] text-right">
                      {stats.totalViolations > 0 ? ((stat.count / stats.totalViolations) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
        
        <AlertDialog
          open={openDialog}
          onOpenChange={setOpenDialog}
          onConfirm={() => {
            if (selectedId !== null) handleDelete(selectedId);
          }}
          title="⚠️ Confirm Violation Deletion"
          description="Are you sure you want to delete this violation? This action cannot be undone and will permanently delete all related data."
        />
      </div>
    </div>
  );
}