import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../../components/Layout/Sidebar";
import Header from "../../components/Layout/Header";
import axios from "axios";
import { format } from "date-fns";
import { toast } from "react-toastify";

interface Camera {
  id: number;
  name: string;
  location: string;
}

interface ViolationType {
  id: number;
  typeName: string;
  description?: string;
}

interface VehicleType {
  id: number;
  name: string;
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

export default function ViolationDetail() {
  const { id } = useParams<{ id: string }>();
  const [violation, setViolation] = useState<Violation | null>(null);
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingViolation, setIsEditingViolation] = useState(false);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [formData, setFormData] = useState<Partial<Violation>>({});
  const [detailFormData, setDetailFormData] = useState<Partial<ViolationDetail>>({});
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");
  const [editTypeId, setEditTypeId] = useState<number | null>(null);
  const [imageExpanded, setImageExpanded] = useState(false);
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8081";

  useEffect(() => {
    if (!id || isNaN(Number(id))) {
      setError("ID vi phạm không hợp lệ.");
      setLoading(false);
      return;
    }

    Promise.all([
      axios.get(`${API_URL}/api/violations/${id}`),
      axios.get(`${API_URL}/api/violations/violationtypes`),
      axios.get(`${API_URL}/api/violations/vehicletypes`),
    ])
      .then(([violationRes, violationTypesRes, vehicleTypesRes]) => {
        setViolation(violationRes.data);
        setFormData({
          camera: violationRes.data.camera,
          vehicleType: violationRes.data.vehicleType,
          vehicle: violationRes.data.vehicle,
        });
        const firstDetail = violationRes.data.violationDetails?.[0] || {};
        setDetailFormData({
          violationType: firstDetail.violationType,
          imageUrl: firstDetail.imageUrl,
          videoUrl: firstDetail.videoUrl,
          location: firstDetail.location,
          violationTime: firstDetail.violationTime,
          speed: firstDetail.speed,
          additionalNotes: firstDetail.additionalNotes,
        });
        setViolationTypes(violationTypesRes.data);
        setVehicleTypes(vehicleTypesRes.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi khi tải dữ liệu:", err);
        setError("Không thể tải dữ liệu. Vui lòng thử lại.");
        setLoading(false);
      });
  }, [id]);

  const handleViolationInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "vehicleType") {
      const selectedType = vehicleTypes.find((vt) => vt.id === Number(value));
      setFormData((prev) => ({ ...prev, vehicleType: selectedType || null }));
    } else if (name === "camera") {
      setFormData((prev) => ({
        ...prev,
        camera: { id: Number(value), name: "", location: "" },
      }));
    } else if (["licensePlate", "vehicleColor", "vehicleBrand"].includes(name)) {
      const vehicleFieldMap: Record<string, keyof Vehicle> = {
        licensePlate: "licensePlate",
        vehicleColor: "color",
        vehicleBrand: "brand",
      };

      const field = vehicleFieldMap[name];

      setFormData((prev) => ({
        ...prev,
        vehicle: {
          id: prev.vehicle?.id ?? 0,
          licensePlate: prev.vehicle?.licensePlate ?? null,
          color: prev.vehicle?.color ?? null,
          brand: prev.vehicle?.brand ?? null,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDetailInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "violationType") {
      const selectedType = violationTypes.find((vt) => vt.id === Number(value));
      setDetailFormData((prev) => ({ ...prev, violationType: selectedType || null }));
    } else {
      setDetailFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateViolationType = async () => {
    if (!newTypeName) {
      toast.error("Tên loại vi phạm không được để trống.");
      return;
    }
    try {
      const newType = await axios.post(`${API_URL}/api/violation-types`, {
        typeName: newTypeName,
        description: newTypeDescription,
      });
      setViolationTypes((prev) => [...prev, newType.data]);
      setShowTypeModal(false);
      setNewTypeName("");
      setNewTypeDescription("");
      toast.success("Tạo loại vi phạm mới thành công!");
    } catch (err) {
      console.error("Lỗi khi tạo loại vi phạm:", err);
      toast.error("Không thể tạo loại vi phạm.");
    }
  };

  const handleEditViolationType = async () => {
    if (!editTypeId || !newTypeName) {
      toast.error("Tên loại vi phạm không được để trống.");
      return;
    }
    try {
      const updatedType = await axios.put(`${API_URL}/api/violation-types/${editTypeId}`, {
        typeName: newTypeName,
        description: newTypeDescription,
      });
      setViolationTypes((prev) =>
        prev.map((vt) => (vt.id === editTypeId ? updatedType.data : vt))
      );
      setShowTypeModal(false);
      setNewTypeName("");
      setNewTypeDescription("");
      setEditTypeId(null);
      toast.success("Cập nhật loại vi phạm thành công!");
    } catch (err) {
      console.error("Lỗi khi cập nhật loại vi phạm:", err);
      toast.error("Không thể cập nhật loại vi phạm.");
    }
  };

  const openEditModal = (type: ViolationType) => {
    setEditTypeId(type.id);
    setNewTypeName(type.typeName);
    setNewTypeDescription(type.description || "");
    setShowTypeModal(true);
  };

  const handleUpdateViolation = async () => {
    if (!id || !formData) return;
    if (!formData.vehicleType || !formData.vehicle?.licensePlate) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc (Loại xe, Biển số).");
      return;
    }

    try {
      setLoading(true);
      const updateData = {
        id: Number(id),
        camera: formData.camera ? { id: formData.camera.id } : null,
        vehicleType: formData.vehicleType ? { id: formData.vehicleType.id } : null,
        vehicle: formData.vehicle ? { 
          id: formData.vehicle.id, 
          licensePlate: formData.vehicle.licensePlate, 
          color: formData.vehicle.color, 
          brand: formData.vehicle.brand 
        } : null,
      };
      const updatedViolation = await axios.put(`${API_URL}/api/violations/${id}`, updateData);
      setViolation((prev) => ({ ...prev, ...updatedViolation.data }));
      setIsEditingViolation(false);
      toast.success("Cập nhật vi phạm thành công!");
    } catch (err) {
      console.error("Lỗi khi cập nhật vi phạm:", err);
      toast.error("Không thể cập nhật vi phạm. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDetail = async () => {
    if (!id || !detailFormData || !violation?.violationDetails?.[0]?.id) return;
    if (!detailFormData.violationType) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc (Loại vi phạm).");
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
      const updatedDetail = await axios.put(`${API_URL}/api/violations/details/${violation.violationDetails[0].id}`, updateData);
      setViolation((prev) => ({
        ...prev!,
        violationDetails: [updatedDetail.data, ...(prev?.violationDetails?.slice(1) || [])],
      }));
      setIsEditingDetail(false);
      toast.success("Cập nhật chi tiết vi phạm thành công!");
    } catch (err) {
      console.error("Lỗi khi cập nhật chi tiết vi phạm:", err);
      toast.error("Không thể cập nhật chi tiết vi phạm. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (typeName: string) => {
    const severity = typeName.toLowerCase();
    if (severity.includes('nghiêm trọng') || severity.includes('nguy hiểm')) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (severity.includes('tốc độ') || severity.includes('vượt')) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    } else {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-col flex-grow overflow-hidden">
          <Header title="Chi tiết vi phạm" />
          <div className="flex items-center justify-center flex-grow">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 font-medium">Đang tải dữ liệu...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-col flex-grow overflow-hidden">
          <Header title="Chi tiết vi phạm" />
          <div className="flex items-center justify-center flex-grow">
            <div className="text-center p-8 bg-red-50 rounded-xl border border-red-200">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Có lỗi xảy ra</h3>
              <p className="text-red-600">{error}</p>
              <Link
                to="/violations"
                className="inline-block mt-4 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Quay lại danh sách
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!violation) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-col flex-grow overflow-hidden">
          <Header title="Chi tiết vi phạm" />
          <div className="flex items-center justify-center flex-grow">
            <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Không tìm thấy</h3>
              <p className="text-gray-600">Vi phạm này không tồn tại hoặc đã bị xóa.</p>
              <Link
                to="/violations"
                className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Quay lại danh sách
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Chi tiết vi phạm" />
        <div className="p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Vi phạm #{violation.id}</h1>
                    <p className="text-gray-500">
                      Ghi nhận lúc {violation.createdAt ? format(new Date(violation.createdAt), "dd/MM/yyyy 'lúc' HH:mm:ss") : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityBadge(violation.violationDetails[0]?.violationType?.typeName || '')}`}>
                    {violation.violationDetails[0]?.violationType?.typeName || "Chưa phân loại"}
                  </span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/violations"
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Quay lại
                </Link>
                
                {!isEditingViolation && !isEditingDetail && (
                  <>
                    <button
                      onClick={() => setIsEditingViolation(true)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Chỉnh sửa thông tin
                    </button>
                    <button
                      onClick={() => setIsEditingDetail(true)}
                      className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Chỉnh sửa chi tiết
                    </button>
                  </>
                )}

                {(isEditingViolation || isEditingDetail) && (
                  <div className="flex space-x-3">
                    <button
                      onClick={isEditingDetail ? handleUpdateDetail : handleUpdateViolation}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : (
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Lưu thay đổi
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingViolation(false);
                        setIsEditingDetail(false);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Media Section */}
              <div className="lg:col-span-2 space-y-6">
                {/* Image */}
                {violation.violationDetails[0]?.imageUrl ? (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Hình ảnh vi phạm
                    </h3>
                    <div className="relative group">
                      <img
                        src={violation.violationDetails[0].imageUrl}
                        alt="Hình ảnh vi phạm"
                        className="w-full h-auto rounded-xl border border-gray-200 cursor-pointer transition-transform group-hover:scale-[1.02]"
                        loading="lazy"
                        onClick={() => setImageExpanded(true)}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-xl transition-all flex items-center justify-center">
                        <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-center py-12 text-gray-400">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="font-medium">Không có hình ảnh</p>
                    </div>
                  </div>
                )}

                {/* Video */}
                {violation.violationDetails[0]?.videoUrl ? (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Video vi phạm
                    </h3>
                    <video
                      src={violation.violationDetails[0].videoUrl}
                      controls
                      className="w-full rounded-xl border border-gray-200"
                    />
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-center py-12 text-gray-400">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="font-medium">Không có video</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Details Section */}
              <div className="space-y-6">
                {/* Vehicle Information */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-9 1h10l2 14H6l2-14z" />
                    </svg>
                    Thông tin phương tiện
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Loại xe:</span>
                      {isEditingViolation ? (
                        <select
                          name="vehicleType"
                          value={formData.vehicleType?.id || ""}
                          onChange={handleViolationInputChange}
                          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Chọn loại xe</option>
                          {vehicleTypes.map((vt) => (
                            <option key={vt.id} value={vt.id}>
                              {vt.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-semibold text-gray-900">
                          {violation.vehicleType?.name || "N/A"}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Biển số:</span>
                      {isEditingViolation ? (
                        <input
                          type="text"
                          name="licensePlate"
                          value={formData.vehicle?.licensePlate || ""}
                          onChange={handleViolationInputChange}
                          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nhập biển số"
                        />
                      ) : (
                        <span className="font-semibold text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                          {violation.vehicle?.licensePlate || "N/A"}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Màu xe:</span>
                      {isEditingViolation ? (
                        <input
                          type="text"
                          name="vehicleColor"
                          value={formData.vehicle?.color || ""}
                          onChange={handleViolationInputChange}
                          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nhập màu xe"
                        />
                      ) : (
                        <span className="font-semibold text-gray-900">
                          {violation.vehicle?.color || "N/A"}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Hãng xe:</span>
                      {isEditingViolation ? (
                        <input
                          type="text"
                          name="vehicleBrand"
                          value={formData.vehicle?.brand || ""}
                          onChange={handleViolationInputChange}
                          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nhập hãng xe"
                        />
                      ) : (
                        <span className="font-semibold text-gray-900">
                          {violation.vehicle?.brand || "N/A"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Violation Details */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Chi tiết vi phạm
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-600 mb-1">Loại vi phạm:</label>
                      {isEditingDetail ? (
                        <div className="flex items-center space-x-2">
                          <select
                            name="violationType"
                            value={detailFormData.violationType?.id || ""}
                            onChange={handleDetailInputChange}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Chọn loại vi phạm</option>
                            {violationTypes.map((vt) => (
                              <option key={vt.id} value={vt.id}>
                                {vt.typeName}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setShowTypeModal(true)}
                            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            title="Thêm loại vi phạm mới"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityBadge(violation.violationDetails[0]?.violationType?.typeName || '')}`}>
                            {violation.violationDetails[0]?.violationType?.typeName || "N/A"}
                          </span>
                          {violation.violationDetails[0]?.violationType && (
                            <button
                              onClick={() => openEditModal(violation.violationDetails[0].violationType!)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Chỉnh sửa
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-gray-600 mb-1">Thời gian vi phạm:</label>
                      {isEditingDetail ? (
                        <input
                          type="datetime-local"
                          name="violationTime"
                          value={detailFormData.violationTime?.slice(0, 16) || ""}
                          onChange={handleDetailInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <span className="font-semibold text-gray-900">
                          {violation.violationDetails[0]?.violationTime
                            ? format(new Date(violation.violationDetails[0].violationTime), "dd/MM/yyyy HH:mm:ss")
                            : "N/A"}
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-gray-600 mb-1">Tốc độ:</label>
                      {isEditingDetail ? (
                        <div className="relative">
                          <input
                            type="number"
                            name="speed"
                            value={detailFormData.speed || ""}
                            onChange={handleDetailInputChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Nhập tốc độ"
                          />
                          <span className="absolute right-3 top-2 text-gray-500">km/h</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-gray-900">
                          {violation.violationDetails[0]?.speed
                            ? (
                              <span className="inline-flex items-center bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                {violation.violationDetails[0].speed} km/h
                              </span>
                            )
                            : "N/A"}
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-gray-600 mb-1">Vị trí:</label>
                      {isEditingDetail ? (
                        <input
                          type="text"
                          name="location"
                          value={detailFormData.location || ""}
                          onChange={handleDetailInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nhập vị trí"
                        />
                      ) : (
                        <span className="font-semibold text-gray-900 flex items-center">
                          <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {violation.violationDetails[0]?.location || "N/A"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Camera Information */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Thông tin camera
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-600 mb-1">Tên camera:</label>
                      {isEditingViolation ? (
                        <input
                          type="text"
                          name="camera"
                          value={formData.camera?.id || ""}
                          onChange={handleViolationInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nhập ID camera"
                        />
                      ) : (
                        <span className="font-semibold text-gray-900">
                          {violation.camera?.name || "N/A"}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Vị trí camera:</label>
                      <span className="font-semibold text-gray-900 flex items-center">
                        <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {violation.camera?.location || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                {(isEditingDetail || violation.violationDetails[0]?.additionalNotes) && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Ghi chú bổ sung
                    </h3>
                    {isEditingDetail ? (
                      <textarea
                        name="additionalNotes"
                        value={detailFormData.additionalNotes || ""}
                        onChange={handleDetailInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập ghi chú bổ sung..."
                        rows={4}
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700">
                          {violation.violationDetails[0]?.additionalNotes || "Không có ghi chú bổ sung"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Image Expanded Modal */}
          {imageExpanded && violation.violationDetails[0]?.imageUrl && (
            <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
              <div className="relative max-w-7xl max-h-full">
                <button
                  onClick={() => setImageExpanded(false)}
                  className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <img
                  src={violation.violationDetails[0].imageUrl}
                  alt="Hình ảnh vi phạm"
                  className="max-w-full max-h-full object-contain rounded-lg"
                  onClick={() => setImageExpanded(false)}
                />
              </div>
            </div>
          )}

          {/* Violation Type Modal */}
          {showTypeModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                      {editTypeId ? "Chỉnh sửa loại vi phạm" : "Tạo loại vi phạm mới"}
                    </h2>
                    <button
                      onClick={() => {
                        setShowTypeModal(false);
                        setNewTypeName("");
                        setNewTypeDescription("");
                        setEditTypeId(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tên loại vi phạm <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập tên loại vi phạm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mô tả
                      </label>
                      <textarea
                        value={newTypeDescription}
                        onChange={(e) => setNewTypeDescription(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập mô tả (tùy chọn)"
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowTypeModal(false);
                        setNewTypeName("");
                        setNewTypeDescription("");
                        setEditTypeId(null);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={editTypeId ? handleEditViolationType : handleCreateViolationType}
                      disabled={!newTypeName.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editTypeId ? "Cập nhật" : "Tạo mới"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}