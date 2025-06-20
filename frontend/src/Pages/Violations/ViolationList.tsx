import React, { useEffect, useState, useCallback, useMemo } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import Header from "../../components/Layout/Header";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AlertDialog } from "./AlertDialog";
import { format } from "date-fns";
import { toast } from "react-toastify";
import ExportViolationsPDF from "./ExportViolationsPDF";
import ChatBot from "../../components/Chatbot/chatbot";
import GenericTable, { TableColumn, TableAction, FilterConfig } from "../../components/Table/GenericTable";
import { Eye, Trash2 } from "lucide-react";

// Types
interface ViolationType {
  id: number;
  typeName: string;
}

interface VehicleType {
  id: number;
  name: string;
}

interface Camera {
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
  camera: Camera | null;
  vehicleType: VehicleType | null;
  vehicle: Vehicle | null;
  createdAt: string | null;
  violationDetails: ViolationDetail[];
}

// Constants
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8081";
const ITEMS_PER_PAGE = 10;

export default function ViolationList() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const navigate = useNavigate();

  // Extract unique violation types for filter
  const violationTypes = useMemo(() => {
    const types = new Map<string, ViolationType>();
    violations.forEach(violation => {
      violation.violationDetails?.forEach(detail => {
        if (detail.violationType) {
          types.set(detail.violationType.typeName, detail.violationType);
        }
      });
    });
    return Array.from(types.values());
  }, [violations]);

  // Filter violations
  const filteredViolations = useMemo(() => {
    return violations.filter(violation => {
      const matchesSearch = !searchTerm || 
        violation.vehicle?.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = !filterType || 
        violation.violationDetails?.some(detail => 
          detail.violationType?.typeName === filterType
        );
      
      return matchesSearch && matchesFilter;
    });
  }, [violations, searchTerm, filterType]);

  // Table columns configuration
  const columns: TableColumn<Violation>[] = useMemo(() => [
    {
      key: 'violationDetails.0.imageUrl',
      title: 'Hình ảnh',
      width: '120px',
      render: (value: string | null) => (
        value ? (
          <div className="relative">
            <img
              src={value}
              alt="Vi phạm"
              className="h-16 w-24 object-cover rounded shadow-sm"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden h-16 w-24 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-gray-400 text-xs">Lỗi ảnh</span>
            </div>
          </div>
        ) : (
          <div className="h-16 w-24 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-400 text-xs">Không có ảnh</span>
          </div>
        )
      )
    },
    {
      key: 'violationDetails.0.violationType.typeName',
      title: 'Loại vi phạm',
      render: (_value, record: Violation) => {
        const detail = record.violationDetails?.[0] || null;
        return (
          <div>
            <span className="font-medium text-gray-900">
              {detail?.violationType?.typeName || "Chưa xác định"}
            </span>
            {detail?.speed && (
              <div className="text-sm text-gray-500">
                Tốc độ: {detail.speed} km/h
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'camera',
      title: 'Camera',
      render: (_value, record: Violation) => (
        record.camera ? (
          <div>
            <div className="font-medium text-gray-900">
              {record.camera.name}
            </div>
            <div className="text-sm text-gray-500">
              {record.camera.location}
            </div>
          </div>
        ) : (
          <span className="text-gray-500">N/A</span>
        )
      )
    },
    {
      key: 'vehicle',
      title: 'Biển số xe',
      render: (_value, record: Violation) => (
        <div>
          <span className="font-mono text-lg font-semibold text-gray-900">
            {record.vehicle?.licensePlate || "N/A"}
          </span>
          {record.vehicle?.brand && (
            <div className="text-sm text-gray-500">
              {record.vehicle.brand} - {record.vehicle.color}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'violationDetails.0.violationTime',
      title: 'Thời gian',
      render: (value: string | null) => {
        if (!value) return "N/A";
        try {
          return format(new Date(value), "dd/MM/yyyy HH:mm:ss");
        } catch {
          return "N/A";
        }
      }
    }
  ], []);

  // Table actions configuration
  const actions: TableAction<Violation>[] = useMemo(() => [
    {
      key: 'view',
      label: 'Xem chi tiết',
      icon: <Eye size={16} />,
      onClick: (record: Violation) => navigate(`/violations/${record.id}`),
      className: 'text-blue-500 hover:text-blue-600'
    },
    {
      key: 'delete',
      label: 'Xóa',
      icon: <Trash2 size={16} />,
      onClick: (record: Violation) => {
        setSelectedId(record.id);
        setOpenDialog(true);
      },
      className: 'text-red-500 hover:text-red-600'
    }
  ], [navigate]);

  // Filter configuration
  const filters: FilterConfig[] = useMemo(() => [
    {
      key: 'licensePlate',
      label: 'Biển số xe',
      type: 'text',
      placeholder: 'Tìm kiếm theo biển số xe...'
    },
    {
      key: 'violationType',
      label: 'Loại vi phạm',
      type: 'select',
      options: violationTypes.map(type => ({
        value: type.typeName,
        label: type.typeName
      }))
    }
  ], [violationTypes]);

  // Filter values
  const filterValues = useMemo(() => ({
    licensePlate: searchTerm,
    violationType: filterType
  }), [searchTerm, filterType]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'licensePlate') {
      setSearchTerm(value);
    } else if (key === 'violationType') {
      setFilterType(value);
    }
    setCurrentPage(1); // Reset to first page on filter change
  }, []);

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterType('');
    setCurrentPage(1);
  }, []);

  // Pagination configuration
  const pagination = useMemo(() => ({
    enabled: true,
    currentPage,
    totalPages: Math.ceil(filteredViolations.length / pageSize),
    pageSize,
    totalItems: filteredViolations.length,
    onPageChange: (page: number) => setCurrentPage(page),
    onPageSizeChange: (size: number) => {
      setPageSize(size);
      setCurrentPage(1); // Reset to first page when page size changes
    }
  }), [filteredViolations.length, currentPage, pageSize]);

  // Load violations with retry capability
  const loadViolations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/violations`);
      setViolations(response.data);
    } catch (err) {
      console.error("Failed to load violations:", err);
      setError("Không thể tải danh sách vi phạm. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  // Handle delete
  const handleDelete = useCallback(async (id: number) => {
    try {
      await axios.delete(`${API_URL}/api/violations/${id}`);
      setViolations(prev => prev.filter(v => v.id !== id));
      setOpenDialog(false);
      toast.success("Xóa vi phạm thành công!");
      
      // Adjust page if needed
      const newTotal = filteredViolations.length - 1;
      const newTotalPages = Math.ceil(newTotal / pageSize);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Không thể xóa vi phạm. Vui lòng thử lại.");
    }
  }, [filteredViolations.length, currentPage, pageSize]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Danh sách vi phạm giao thông" />
        <div className="flex-grow p-6 overflow-auto">
          <div className="max-w-full">
            {/* Export and Stats */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center space-x-4">
                <ExportViolationsPDF violations={filteredViolations} />
                <div className="text-sm text-gray-600">
                  Tổng cộng: <span className="font-semibold">{filteredViolations.length}</span> vi phạm
                </div>
              </div>
            </div>

            {/* Generic Table */}
            <GenericTable<Violation>
              data={violations}
              filteredData={filteredViolations}
              columns={columns}
              rowKey="id"
              actions={actions}
              filters={filters}
              filterValues={filterValues}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              loading={loading}
              error={error}
              onRetry={handleRetry}
              onRowClick={(record) => navigate(`/violations/${record.id}`)}
              pagination={pagination}
              emptyMessage="Chưa có vi phạm nào"
              className="border border-gray-200"
            />
          </div>
          
          <ChatBot />
        </div>
      </div>
      
      <AlertDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onConfirm={() => {
          if (selectedId !== null) handleDelete(selectedId);
        }}
        title="Xác nhận xóa"
        description="Bạn có chắc muốn xóa vi phạm này? Hành động này không thể hoàn tác."
      />
    </div>
  );
}