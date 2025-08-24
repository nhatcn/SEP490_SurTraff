import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Car, Truck, Bike, Circle, Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GenericTable, { TableColumn, FilterConfig } from "../Table/GenericTable";
import AlertDialog from "./AlertDialog";
import { API_URL_BE } from "../Link/LinkAPI";

interface UserType {
  userId: number;
  userName: string;
  fullName: string;
  email: string;
}

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

const vehicleTypes = [
  { id: 1, typeName: "car" },
  { id: 2, typeName: "truck" },
  { id: 3, typeName: "motobike" },
];

const getVehicleIcon = (vehicleTypeId: number) => {
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

export default function TableVehicle({ vehicles = [], setVehicles }: TableVehicleProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [userData, setUserData] = useState<{ [key: number]: UserType }>({});

  useEffect(() => {
    const fetchUserData = async () => {
      const uniqueUserIds = Array.from(new Set(vehicles.map((v) => v.userId)));
      const fetchPromises = uniqueUserIds.map(async (userId) => {
        try {
          const response = await fetch(`${API_URL_BE}api/users/${userId}`, {
            headers: { "Content-Type": "application/json" },
          });
          if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
          const data: UserType = await response.json();
          return { userId, data };
        } catch (err) {
          console.error(`Failed to fetch user ${userId}:`, err);
          return { userId, data: { userId, userName: "N/A", fullName: "N/A", email: "N/A" } };
        }
      });

      const results = await Promise.all(fetchPromises);
      const newUserData = results.reduce((acc, { userId, data }) => {
        acc[userId] = data;
        return acc;
      }, {} as { [key: number]: UserType });
      setUserData(newUserData);
    };

    if (vehicles.length > 0) {
      fetchUserData();
    }
  }, [vehicles]);

  const brands = useMemo(() => {
    return Array.from(new Set(vehicles.map((v) => v.brand).filter(Boolean)));
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const matchesSearch = !searchTerm ||
        vehicle.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilterBrand = !filterBrand || vehicle.brand === filterBrand;
      return matchesSearch && matchesFilterBrand;
    }) || [];
  }, [vehicles, searchTerm, filterBrand]);

  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredVehicles.slice(startIndex, endIndex) || [];
  }, [filteredVehicles, currentPage, pageSize]);

  const totalPages = useMemo(() => Math.ceil((filteredVehicles?.length || 0) / pageSize), [filteredVehicles, pageSize]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === "licensePlate") {
      setSearchTerm(value);
    } else if (key === "brand") {
      setFilterBrand(value);
    }
    setCurrentPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setFilterBrand("");
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

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

  const columns: TableColumn<VehicleType>[] = [
    {
      key: "licensePlate",
      title: "License Plate",
      width: "16%",
      render: (_, vehicle, index) => (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="flex items-center gap-2"
        >
          <div className="p-1 bg-green-100 rounded-lg border border-gray-300">
            {getVehicleIcon(vehicle.vehicleTypeId)}
          </div>
          <span
            className="font-mono text-lg font-bold text-gray-900 bg-gradient-to-r from-green-50 to-green-100 px-3 py-1 rounded-lg border border-gray-200 transition-colors hover:text-green-600"
          >
            {vehicle.licensePlate || "N/A"}
          </span>
        </motion.div>
      ),
    },
    {
      key: "name",
      title: "Type",
      width: "16%",
      render: (_, vehicle) => (
        <span className="text-gray-900">{vehicle.name || "N/A"}</span>
      ),
    },
    {
      key: "brand",
      title: "Brand",
      width: "16%",
      render: (_, vehicle) => (
        <span className="text-gray-900">{vehicle.brand || "N/A"}</span>
      ),
    },
    {
      key: "color",
      title: "Color",
      width: "16%",
      render: (_, vehicle) => (
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full border border-gray-300"
            style={{ backgroundColor: vehicle.color || "#000000" }}
          ></div>
          <span className="capitalize">{vehicle.color || "N/A"}</span>
        </div>
      ),
    },
    {
      key: "userId",
      title: "User Info",
      width: "28%",
      render: (_, vehicle) => (
        <div className="flex flex-col gap-1">
          <span className="text-gray-900 font-medium">{userData[vehicle.userId]?.userName || "N/A"}</span>
          <span className="text-gray-600 text-sm">{userData[vehicle.userId]?.fullName || "N/A"}</span>
          <span className="text-gray-500 text-xs">{userData[vehicle.userId]?.email || "N/A"}</span>
        </div>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      width: "8%",
      render: (_, vehicle) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="text-blue-600 hover:text-blue-800 p-2 rounded-lg border border-gray-300 transition-colors hover:bg-blue-50"
            onClick={() => navigate(`/vehicles/${vehicle.id}`)}
            title="View Details"
          >
            <Eye size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="text-red-600 hover:text-red-800 p-2 rounded-lg border border-gray-300 transition-colors hover:bg-red-50"
            onClick={() => {
              setSelectedId(vehicle.id);
              setOpenDialog(true);
            }}
            title="Delete"
          >
            <Trash2 size={16} />
          </motion.button>
        </div>
      ),
    },
  ];

  const filters: FilterConfig[] = [
    {
      key: "licensePlate",
      label: "License Plate",
      type: "text",
      placeholder: "Enter license plate...",
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      options: brands.map((brand) => ({ value: brand, label: brand })),
    },
  ];

  const filterValues = useMemo(
    () => ({
      licensePlate: searchTerm,
      brand: filterBrand,
    }),
    [searchTerm, filterBrand]
  );

  return (
    <div className="relative max-w-full overflow-hidden" style={{ tableLayout: "fixed" }}>
      <GenericTable
        data={vehicles}
        filteredData={paginatedVehicles}
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
          totalItems: filteredVehicles.length,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        onRowClick={(vehicle) => navigate(`/vehicles/${vehicle.id}`)}
        emptyMessage="🚫 No vehicles found. Try adjusting your search criteria."
        className="bg-[rgba(255,255,255,0.95)] rounded-[16px] shadow-[0_10px_15px_rgba(0,0,0,0.1)] border border-[rgba(203,213,225,0.5)] backdrop-blur-[10px] w-full"
      />
      <AlertDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onConfirm={() => {
          if (selectedId !== null) handleDelete(selectedId);
        }}
        title="⚠️ Confirm Vehicle Deletion"
        description="Are you sure you want to delete this vehicle? This action cannot be undone and will permanently delete all related data."
      />
    </div>
  );
}