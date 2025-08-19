
import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Search, Filter, ChevronDown, X, AlertTriangle, ChevronLeft, ChevronRight, Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AlertDialog from "./AlertDialog";
import { API_URL_BE } from "../Link/LinkAPI";

interface VehicleType {
  id: number;
  name: string;
  licensePlate: string;
  userId: number;
  vehicleTypeId: number;
  color: string;
  brand: string;
}

interface TableVehicleProps {
  vehicles?: VehicleType[];
  setVehicles?: React.Dispatch<React.SetStateAction<VehicleType[]>>;
}

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 15, 20, 25, 50];

export default function TableVehicle({ vehicles = [], setVehicles }: TableVehicleProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Extract unique brands
  const brands = useMemo(() => {
    return Array.from(new Set(vehicles.map((v) => v.brand).filter(Boolean)));
  }, [vehicles]);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const matchesSearch = !searchTerm ||
        vehicle.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilterBrand = !filterBrand || vehicle.brand === filterBrand;
      return matchesSearch && matchesFilterBrand;
    }) || [];
  }, [vehicles, searchTerm, filterBrand]);

  // Paginated data
  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredVehicles.slice(startIndex, endIndex) || [];
  }, [filteredVehicles, currentPage, pageSize]);

  const totalPages = useMemo(() => Math.ceil((filteredVehicles?.length || 0) / pageSize), [filteredVehicles, pageSize]);

  const availablePageSizeOptions = useMemo(() => {
    if (!filteredVehicles || filteredVehicles.length === 0) return [ITEMS_PER_PAGE_OPTIONS[0]];
    return ITEMS_PER_PAGE_OPTIONS.filter(size => size <= filteredVehicles.length || size === ITEMS_PER_PAGE_OPTIONS[0]);
  }, [filteredVehicles]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === "licensePlate") {
      setSearchTerm(value);
    } else if (key === "brand") {
      setFilterBrand(value);
    }
    setCurrentPage(1);
  }, []);

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setFilterBrand("");
    setCurrentPage(1);
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // Handle delete
  const handleDelete = useCallback(async (id: number) => {
    try {
      const response = await fetch(`${API_URL_BE}api/vehicle/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      if (setVehicles) {
        setVehicles((prev) => prev.filter((v) => v.id !== id));
        const newTotal = filteredVehicles.length - 1;
        const newTotalPages = Math.ceil(newTotal / pageSize);
        if (newTotalPages === 0) {
          setCurrentPage(1);
        } else if (currentPage > newTotalPages) {
          setCurrentPage(newTotalPages);
        } else if (paginatedVehicles.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      }
      setOpenDialog(false);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }, [setVehicles, filteredVehicles, currentPage, pageSize, paginatedVehicles]);

  return (
    <motion.div
      style={{
        background: "rgba(255,255,255,0.95)",
        borderRadius: "16px",
        boxShadow: "0 10px 15px rgba(0,0,0,0.1)",
        border: "1px solid rgba(203,213,225,0.5)",
        overflow: "hidden",
        backdropFilter: "blur(10px)",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Controls Section */}
      <div style={{
        background: "linear-gradient(to right, rgba(249,250,251,0.95), rgba(219,234,254,0.95))",
        padding: "16px 24px",
        borderBottom: "1px solid rgba(203,213,225,0.5)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ padding: "8px", background: "linear-gradient(to right, #3b82f6, #7e22ce)", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                <Car style={{ color: "#fff" }} size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>Vehicle List</h3>
                <p style={{ fontSize: "14px", color: "#4b5563" }}>Manage and track registered vehicles</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "rgba(220,252,231,0.8)", color: "#047857", padding: "4px 12px", borderRadius: "9999px", fontSize: "14px", fontWeight: 500 }}>
                {(filteredVehicles || []).length} records
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#4b5563" }}>
                <span>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  style={{
                    padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "8px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)", transition: "all 0.2s", outline: "none",
                  }}
                  onFocus={(e) => e.currentTarget.style.boxShadow = "0 0 0 2px #3b82f6"}
                  onBlur={(e) => e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)"}
                  aria-label="Select number of entries per page"
                >
                  {availablePageSizeOptions.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <span>entries</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px",
                background: "#fff", color: "#374151", borderRadius: "12px", border: "1px solid #d1d5db",
                cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#f9fafb"}
              onMouseOut={(e) => e.currentTarget.style.background = "#fff"}
              aria-label={showFilters ? "Hide filters" : "Show filters"}
            >
              <Filter size={16} />
              <span>Filters</span>
              <ChevronDown size={16} style={{ transform: showFilters ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
            </motion.button>
            {(searchTerm || filterBrand) && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", color: "#4b5563" }}>Filtered from {vehicles.length} total</span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleResetFilters}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px", padding: "4px 12px",
                    background: "#fee2e2", color: "#dc2626", borderRadius: "8px", border: "none",
                    cursor: "pointer", transition: "background-color 0.2s",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#fecaca"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#fee2e2"}
                  aria-label="Clear all filters"
                >
                  <X size={14} />
                  <span style={{ fontSize: "14px" }}>Clear</span>
                </motion.button>
              </div>
            )}
          </div>
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                style={{ borderTop: "1px solid rgba(203,213,225,0.5)", paddingTop: "24px" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                  <div style={{ position: "relative" }}>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>
                      Search License Plate
                    </label>
                    <div style={{ position: "relative" }}>
                      <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} size={16} />
                      <input
                        type="text"
                        placeholder="Enter license plate..."
                        value={searchTerm}
                        onChange={(e) => handleFilterChange("licensePlate", e.target.value)}
                        style={{
                          width: "100%", padding: "8px 16px 8px 40px", border: "1px solid #d1d5db",
                          borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                          transition: "all 0.2s", outline: "none",
                        }}
                        onFocus={(e) => e.currentTarget.style.boxShadow = "0 0 0 2px #3b82f6"}
                        onBlur={(e) => e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)"}
                        aria-label="Search by license plate"
                      />
                    </div>
                  </div>
                  <div style={{ position: "relative" }}>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>
                      Brand
                    </label>
                    <select
                      value={filterBrand}
                      onChange={(e) => handleFilterChange("brand", e.target.value)}
                      style={{
                        width: "100%", padding: "8px 16px", border: "1px solid #d1d5db",
                        borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                        transition: "all 0.2s", outline: "none",
                      }}
                      onFocus={(e) => e.currentTarget.style.boxShadow = "0 0 0 2px #3b82f6"}
                      onBlur={(e) => e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)"}
                      aria-label="Filter by brand"
                    >
                      <option value="">All Brands</option>
                      {brands.map((brand) => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }} role="grid" aria-describedby="vehicle-table-desc">
          <caption id="vehicle-table-desc" style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0,0,0,0)" }}>
            List of registered vehicles with details including license plate, type, brand, color, user ID, and actions.
          </caption>
          <thead style={{ background: "rgba(249,250,251,0.8)", position: "sticky", top: 0, zIndex: 10 }}>
            <tr>
              {["License Plate", "Type", "Brand", "Color", "User ID", "Actions"].map((header) => (
                <th key={header} style={{
                  padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 500,
                  color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", minWidth: header === "Actions" ? "80px" : "120px",
                }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: "#fff", borderTop: "1px solid #e5e7eb" }}>
            {(paginatedVehicles || []).length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                    <AlertTriangle style={{ width: "48px", height: "48px", color: "#9ca3af" }} />
                    <p style={{ fontSize: "18px", color: "#6b7280" }}>🚫 No vehicles found</p>
                    <p style={{ fontSize: "14px", color: "#9ca3af" }}>Try adjusting your search criteria</p>
                  </div>
                </td>
              </tr>
            ) : (
              (paginatedVehicles || []).map((vehicle, index) => (
                <motion.tr
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  style={{ cursor: "pointer", transition: "background-color 0.2s" }}
                  onMouseOver={(e) => e.currentTarget.style.background = "rgba(219,234,254,0.5)"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#fff"}
                  onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                  role="row"
                >
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ padding: "4px", background: "#dcfce7", borderRadius: "8px" }}>
                        <Car size={14} style={{ color: "#059669" }} />
                      </div>
                      <span style={{
                        fontFamily: "monospace", fontSize: "18px", fontWeight: 700, color: "#111827",
                        background: "linear-gradient(to right, #f0fdf4, #d1fae5)", padding: "4px 12px",
                        borderRadius: "8px", border: "1px solid #e5e7eb", transition: "color 0.2s",
                      }}
                      onMouseOver={(e) => e.currentTarget.style.color = "#059669"}
                      onMouseOut={(e) => e.currentTarget.style.color = "#111827"}
                      >
                        {vehicle.licensePlate || "N/A"}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{ color: "#111827" }}>{vehicle.name || "N/A"}</span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{ color: "#111827" }}>{vehicle.brand || "N/A"}</span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: vehicle.color || "#000000" }}></div>
                      <span style={{ textTransform: "capitalize" }}>{vehicle.color || "N/A"}</span>
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{ color: "#111827" }}>{vehicle.userId || "N/A"}</span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                        style={{
                          color: "#2563eb", padding: "8px", borderRadius: "8px", border: "none",
                          transition: "all 0.2s", cursor: "pointer",
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "rgba(219,234,254,0.5)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                        title="View Details"
                        aria-label={`View details for vehicle ${vehicle.id}`}
                      >
                        <Eye size={16} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setSelectedId(vehicle.id);
                          setOpenDialog(true);
                        }}
                        style={{
                          color: "#dc2626", padding: "8px", borderRadius: "8px", border: "none",
                          transition: "all 0.2s", cursor: "pointer",
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "rgba(254,226,226,0.5)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                        title="Delete"
                        aria-label={`Delete vehicle ${vehicle.id}`}
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span style={{ fontSize: "14px", color: "#374151" }}>
              Page {currentPage} of {totalPages}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                display: "flex", alignItems: "center", padding: "8px 12px", fontSize: "14px",
                borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff",
                cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1,
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => currentPage !== 1 && (e.currentTarget.style.background = "#f9fafb")}
              onMouseOut={(e) => currentPage !== 1 && (e.currentTarget.style.background = "#fff")}
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} style={{ marginRight: "4px" }} />
              Previous
            </motion.button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber: number;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
              return (
                <motion.button
                  key={pageNumber}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePageChange(pageNumber)}
                  style={{
                    padding: "8px 12px", fontSize: "14px", borderRadius: "8px", border: "1px solid #d1d5db",
                    background: currentPage === pageNumber ? "#3b82f6" : "#fff", color: currentPage === pageNumber ? "#fff" : "#374151",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => currentPage !== pageNumber && (e.currentTarget.style.background = "#f9fafb")}
                  onMouseOut={(e) => currentPage !== pageNumber && (e.currentTarget.style.background = "#fff")}
                  aria-label={`Go to page ${pageNumber}`}
                >
                  {pageNumber}
                </motion.button>
              );
            })}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                display: "flex", alignItems: "center", padding: "8px 12px", fontSize: "14px",
                borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1,
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => currentPage !== totalPages && (e.currentTarget.style.background = "#f9fafb")}
              onMouseOut={(e) => currentPage !== totalPages && (e.currentTarget.style.background = "#fff")}
              title="Next page"
              aria-label="Next page"
            >
              Next
              <ChevronRight size={16} style={{ marginLeft: "4px" }} />
            </motion.button>
          </div>
        </div>
      )}

      {/* Alert Dialog */}
      <AlertDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onConfirm={() => {
          if (selectedId !== null) handleDelete(selectedId);
        }}
        title="⚠️ Confirm Vehicle Deletion"
        description="Are you sure you want to delete this vehicle? This action cannot be undone and will permanently delete all related data."
      />
    </motion.div>
  );
}
