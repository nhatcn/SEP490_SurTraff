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
  typeName: string;
}

interface ViolationDetail {
  id: number;
  camera?: Camera | null;
  violationType?: ViolationType | null;
  vehicleType?: VehicleType | null;
  licensePlate?: string | null;
  vehicleColor?: string | null;
  vehicleBrand?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  violationTime?: string | null;
  createdAt?: string | null;
}

export default function ViolationDetail() {
  const { id } = useParams<{ id: string }>();
  const [violation, setViolation] = useState<ViolationDetail | null>(null);
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ViolationDetail>>({});
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");
  const [editTypeId, setEditTypeId] = useState<number | null>(null);
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
        setFormData(violationRes.data);
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "violationType") {
      const selectedType = violationTypes.find((vt) => vt.id === Number(value));
      setFormData((prev) => ({ ...prev, violationType: selectedType || null }));
    } else if (name === "vehicleType") {
      const selectedType = vehicleTypes.find((vt) => vt.id === Number(value));
      setFormData((prev) => ({ ...prev, vehicleType: selectedType || null }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
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

  const handleUpdate = async () => {
    if (!id || !formData) return;
    if (!formData.violationType || !formData.vehicleType || !formData.licensePlate) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc (Loại vi phạm, Loại xe, Biển số).");
      return;
    }

    try {
      setLoading(true);
      const updateData = {
        id: Number(id),
        violationType: formData.violationType ? { id: formData.violationType.id } : null,
        vehicleType: formData.vehicleType ? { id: formData.vehicleType.id } : null,
        licensePlate: formData.licensePlate || null,
        vehicleColor: formData.vehicleColor || null,
        vehicleBrand: formData.vehicleBrand || null,
        camera: formData.camera ? { id: formData.camera.id } : null,
        imageUrl: formData.imageUrl || null,
        videoUrl: formData.videoUrl || null,
        violationTime: formData.violationTime || null,
        createdAt: formData.createdAt || null,
      };
      await axios.put(`${API_URL}/api/violations/${id}`, updateData);
      setViolation(formData as ViolationDetail);
      setIsEditing(false);
      toast.success("Cập nhật vi phạm thành công!");
    } catch (err) {
      console.error("Lỗi khi cập nhật vi phạm:", err);
      toast.error("Không thể cập nhật vi phạm. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Chi tiết vi phạm" />
        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-600">Đang tải...</div>
          ) : error ? (
            <div className="text-red-600 text-center">{error}</div>
          ) : violation ? (
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-lg space-y-6">
              <div className="text-xl font-semibold text-gray-800">
                Vi phạm #{violation.id}
              </div>
              {violation.imageUrl ? (
                <img
                  src={violation.imageUrl}
                  alt="Hình ảnh vi phạm"
                  className="w-full h-auto rounded-xl border"
                  loading="lazy"
                />
              ) : (
                <div className="text-gray-500 italic text-center">Không có ảnh</div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <strong>Camera:</strong>{" "}
                  {violation.camera
                    ? `${violation.camera.name} - ${violation.camera.location}`
                    : "N/A"}
                </div>
                <div>
                  <strong>Loại vi phạm:</strong>{" "}
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      <select
                        name="violationType"
                        value={formData.violationType?.id || ""}
                        onChange={handleInputChange}
                        className="border rounded p-1 w-full"
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
                        className="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                      >
                        Thêm mới
                      </button>
                    </div>
                  ) : (
                    <span>
                      {violation.violationType?.typeName || "N/A"}
                      {violation.violationType && (
                        <button
                          onClick={() => openEditModal(violation.violationType!)}
                          className="ml-2 text-blue-600 hover:underline"
                        >
                          Sửa
                        </button>
                      )}
                    </span>
                  )}
                </div>
                <div>
                  <strong>Loại xe:</strong>{" "}
                  {isEditing ? (
                    <select
                      name="vehicleType"
                      value={formData.vehicleType?.id || ""}
                      onChange={handleInputChange}
                      className="border rounded p-1 w-full"
                    >
                      <option value="">Chọn loại xe</option>
                      {vehicleTypes.map((vt) => (
                        <option key={vt.id} value={vt.id}>
                          {vt.typeName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    violation.vehicleType?.typeName || "N/A"
                  )}
                </div>
                <div>
                  <strong>Biển số:</strong>{" "}
                  {isEditing ? (
                    <input
                      type="text"
                      name="licensePlate"
                      value={formData.licensePlate || ""}
                      onChange={handleInputChange}
                      className="border rounded p-1 w-full"
                      placeholder="Nhập biển số"
                    />
                  ) : (
                    violation.licensePlate || "N/A"
                  )}
                </div>
                <div>
                  <strong>Màu xe:</strong>{" "}
                  {isEditing ? (
                    <input
                      type="text"
                      name="vehicleColor"
                      value={formData.vehicleColor || ""}
                      onChange={handleInputChange}
                      className="border rounded p-1 w-full"
                      placeholder="Nhập màu xe"
                    />
                  ) : (
                    violation.vehicleColor || "N/A"
                  )}
                </div>
                <div>
                  <strong>Hãng xe:</strong>{" "}
                  {isEditing ? (
                    <input
                      type="text"
                      name="vehicleBrand"
                      value={formData.vehicleBrand || ""}
                      onChange={handleInputChange}
                      className="border rounded p-1 w-full"
                      placeholder="Nhập hãng xe"
                    />
                  ) : (
                    violation.vehicleBrand || "N/A"
                  )}
                </div>
                <div>
                  <strong>Thời gian vi phạm:</strong>{" "}
                  {violation.violationTime
                    ? format(new Date(violation.violationTime), "dd/MM/yyyy HH:mm:ss")
                    : "N/A"}
                </div>
                <div>
                  <strong>Thời gian ghi nhận:</strong>{" "}
                  {violation.createdAt
                    ? format(new Date(violation.createdAt), "dd/MM/yyyy HH:mm:ss")
                    : "N/A"}
                </div>
              </div>
              {violation.videoUrl ? (
                <div>
                  <video
                    src={violation.videoUrl}
                    controls
                    className="w-full rounded-xl border"
                  />
                </div>
              ) : (
                <div className="text-gray-500 italic text-center">Không có video</div>
              )}
              <div className="flex space-x-4">
                <Link
                  to="/violations"
                  className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                >
                  Quay lại danh sách
                </Link>
                {isEditing ? (
                  <>
                    <button
                      onClick={handleUpdate}
                      className="mt-4 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
                    >
                      Lưu
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700"
                    >
                      Hủy
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700"
                  >
                    Chỉnh sửa
                  </button>
                )}
              </div>
              {/* Modal để tạo hoặc chỉnh sửa ViolationType */}
              {showTypeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                    <h2 className="text-lg font-semibold mb-4">
                      {editTypeId ? "Chỉnh sửa loại vi phạm" : "Tạo loại vi phạm mới"}
                    </h2>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Tên loại vi phạm
                      </label>
                      <input
                        type="text"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        className="mt-1 border rounded p-2 w-full"
                        placeholder="Nhập tên loại vi phạm"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Mô tả
                      </label>
                      <textarea
                        value={newTypeDescription}
                        onChange={(e) => setNewTypeDescription(e.target.value)}
                        className="mt-1 border rounded p-2 w-full"
                        placeholder="Nhập mô tả (tùy chọn)"
                        rows={4}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setShowTypeModal(false);
                          setNewTypeName("");
                          setNewTypeDescription("");
                          setEditTypeId(null);
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={editTypeId ? handleEditViolationType : handleCreateViolationType}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        {editTypeId ? "Lưu" : "Tạo"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-600">Không tìm thấy vi phạm.</div>
          )}
        </div>
      </div>
    </div>
  );
}