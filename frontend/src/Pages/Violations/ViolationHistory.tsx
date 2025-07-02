import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Layout/Sidebar";
import axios from "axios";
import { format } from "date-fns";
import { toast } from "react-toastify";
import ExportViolationsPDF from "./ExportViolationsPDF";
import { AlertDialog } from "./AlertDialog";

interface ViolationType {
  id: number;
  typeName: string;
}

interface Vehicle {
  id: number;
  licensePlate: string | null;
}

interface ViolationDetail {
  id: number;
  violationType: ViolationType | null;
  violationTime: string | null;
  imageUrl?: string | null; // Tùy chọn, không có trong API hiện tại
}

interface Violation {
  id: number;
  vehicle: Vehicle | null;
  violationDetails: ViolationDetail[];
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const API_URL = "http://localhost:8080/api";
const ITEMS_PER_PAGE = 10;

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin h-8 w-8 border-2 border-green-600 border-t-transparent rounded-full"></div>
  </div>
);

const ErrorMessage: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="text-center bg-red-100 p-6 rounded-lg">
    <p className="text-red-600 mb-4">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        Thử lại
      </button>
    )}
  </div>
);

const EmptyState: React.FC = () => (
  <div className="text-center py-12">
    <div className="text-gray-400 text-6xl mb-4">📷</div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có vi phạm nào</h3>
    <p className="text-gray-500">Danh sách vi phạm sẽ hiển thị tại đây.</p>
  </div>
);

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
    let end = Math.min(totalPages, start + showPages - 1);
    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Trước
        </button>
        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              page === currentPage
                ? "bg-green-500 text-white border-green-500"
                : "text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Sau
        </button>
      </div>
      <p className="text-sm text-gray-700">
        Trang {currentPage} / {totalPages}
      </p>
    </div>
  );
};

const SearchAndFilter: React.FC<{
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onFilterChange: (value: string) => void;
  violationTypes: ViolationType[];
}> = ({ searchTerm, onSearchChange, filterType, onFilterChange, violationTypes }) => {
  return (
    <div className="mb-6 flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Tìm kiếm theo biển số xe..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>
      <div className="sm:w-48">
        <select
          value={filterType}
          onChange={(e) => onFilterChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">Tất cả loại vi phạm</option>
          {violationTypes.map((type) => (
            <option key={type.id} value={type.typeName}>
              {type.typeName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const ViolationRow: React.FC<{
  violation: Violation;
  onView: (id: number) => void;
  onDelete: (id: number) => void;
}> = React.memo(({ violation, onView, onDelete }) => {
  const detail = violation.violationDetails?.[0] || null;

  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss");
    } catch {
      return "N/A";
    }
  }, []);

  return (
    <tr className="border-t hover:bg-gray-50 transition-colors">
      <td className="p-3">
        {detail?.imageUrl ? (
          <div className="relative">
            <img
              src={detail.imageUrl}
              alt="Vi phạm"
              className="h-16 w-24 object-cover rounded shadow-sm"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                target.nextElementSibling?.classList.remove("hidden");
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
        )}
      </td>
      <td className="p-3">
        <span className="font-medium text-gray-900">
          {detail?.violationType?.typeName || "Chưa xác định"}
        </span>
      </td>
      <td className="p-3 text-sm text-gray-600">{formatDate(detail?.violationTime)}</td>
      <td className="p-3">
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 text-sm rounded bg-green-500 text-white hover:bg-green-600 transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
            onClick={() => onView(violation.id)}
          >
            Xem chi tiết
          </button>
          <button
            className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            onClick={() => onDelete(violation.id)}
          >
            Xóa
          </button>
        </div>
      </td>
    </tr>
  );
});

ViolationRow.displayName = "ViolationRow";

export default function ViolationHistory() {
  const { plate } = useParams<{ plate: string }>();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  const violationTypes = useMemo(() => {
    const types = new Map<string, ViolationType>();
    violations.forEach((violation) => {
      violation.violationDetails?.forEach((detail) => {
        if (detail.violationType) {
          types.set(detail.violationType.typeName, detail.violationType);
        }
      });
    });
    return Array.from(types.values());
  }, [violations]);

  const filteredViolations = useMemo(() => {
    return violations.filter((violation) => {
      const matchesSearch =
        !searchTerm ||
        violation.vehicle?.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        !filterType ||
        violation.violationDetails?.some(
          (detail) => detail.violationType?.typeName === filterType
        );
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

  const loadViolations = useCallback(async () => {
    if (!plate) {
      setError("Biển số không hợp lệ.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/violations?plate=${plate}`);
      const data = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);
      setViolations(data);
    } catch (err) {
      console.error("Lỗi API:", err);
      setError("Không thể tải danh sách vi phạm. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [plate, refreshKey]);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await axios.delete(`${API_URL}/api/violations/${id}`);
        setViolations((prev) => prev.filter((v) => v.id !== id));
        setOpenDialog(false);
        toast.success("Xóa vi phạm thành công!");
        const newTotal = filteredViolations.length - 1;
        const newTotalPages = Math.ceil(newTotal / ITEMS_PER_PAGE);
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
      } catch (err) {
        console.error("Xóa thất bại:", err);
        toast.error("Không thể xóa vi phạm. Vui lòng thử lại.");
      }
    },
    [filteredViolations.length, currentPage]
  );

  const handleView = useCallback(
    (id: number) => {
      navigate(`/violations/${id}`);
    },
    [navigate]
  );

  const handleDeleteClick = useCallback((id: number) => {
    setSelectedId(id);
    setOpenDialog(true);
  }, []);

  const handleRetry = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 font-inter">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <h1 className="px-6 py-4 text-xl font-semibold text-white bg-gradient-to-r from-green-500 to-teal-500 shadow-md">
          Lịch sử vi phạm - {plate || "N/A"}
        </h1>
        <div className="flex-grow p-6 overflow-auto">
          <div className="max-w-full">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center space-x-4">
                <ExportViolationsPDF
                  violations={filteredViolations}
                  
                />
                <div className="text-sm text-gray-600">
                  Tổng cộng: <span className="font-semibold">{filteredViolations.length}</span> vi phạm
                </div>
              </div>
            </div>
            <SearchAndFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterType={filterType}
              onFilterChange={setFilterType}
              violationTypes={violationTypes}
            />
            {loading ? (
              <LoadingSpinner />
            ) : error ? (
              <ErrorMessage message={error} onRetry={handleRetry} />
            ) : filteredViolations.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
                      <tr>
                        <th className="px-3 py-4 text-left text-xs font-medium uppercase tracking-wider">
                          Hình ảnh
                        </th>
                        <th className="px-3 py-4 text-left text-xs font-medium uppercase tracking-wider">
                          Loại vi phạm
                        </th>
                        <th className="px-3 py-4 text-left text-xs font-medium uppercase tracking-wider">
                          Thời gian
                        </th>
                        <th className="px-3 py-4 text-left text-xs font-medium uppercase tracking-wider">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedViolations.map((violation) => (
                        <ViolationRow
                          key={violation.id}
                          violation={violation}
                          onView={handleView}
                          onDelete={handleDeleteClick}
                        />
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
      </div>
    </div>
  );
}