import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";

interface CameraType {
  id: number;
  name: string;
}

interface VehicleType {
  id: number;
  name: string;
  license_plate: string;
  color: string;
  brand: string;
  vehicle_type: string;
  image_url: string;
  video_url: string;
  created_at: string;
  camera: CameraType;
  description: string;
  userId: number;
  vehicleTypeId: number;
}

export default function VehicleDetail() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState<VehicleType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Các state để sửa
  const [editName, setEditName] = useState("");
  const [editLicensePlate, setEditLicensePlate] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editUserId, setEditUserId] = useState<number>(0);
  const [editVehicleTypeId, setEditVehicleTypeId] = useState<number>(0);

  useEffect(() => {
    fetch(`http://localhost:8081/api/vehicle/${id}`)
      .then((res) => res.json())
      .then((data) => {
        const transformed: VehicleType = {
          id: data.id,
          name: data.name,
          license_plate: data.licensePlate,
          color: data.color,
          brand: data.brand,
          vehicle_type: data.vehicleType,
          image_url: data.imageUrl,
          video_url: data.videoUrl,
          created_at: data.createdAt || new Date().toISOString(),
          description: data.description || "",
          camera: data.camera || { id: 0, name: "Không xác định" },
          userId: data.userId,
          vehicleTypeId: data.vehicleTypeId,
        };
        setVehicle(transformed);

        // Gán dữ liệu ban đầu vào các ô input
        setEditName(transformed.name);
        setEditLicensePlate(transformed.license_plate);
        setEditColor(transformed.color);
        setEditBrand(transformed.brand);
        setEditUserId(transformed.userId);
        setEditVehicleTypeId(transformed.vehicleTypeId);
      })
      .catch(console.error);
  }, [id]);

  const handleSave = async () => {
    if (!vehicle) return;

    try {
      const updatedVehicle = {
        id: vehicle.id,
        name: editName,
        licensePlate: editLicensePlate,
        userId: editUserId,
        vehicleTypeId: editVehicleTypeId,
        color: editColor,
        brand: editBrand,
      };

      const res = await fetch(`http://localhost:8081/api/vehicle/${vehicle.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedVehicle),
      });

      if (!res.ok) {
        alert("Cập nhật thất bại");
        return;
      }

      const updatedData = await res.json();
      const transformed: VehicleType = {
        ...vehicle,
        name: updatedData.name,
        license_plate: updatedData.licensePlate,
        color: updatedData.color,
        brand: updatedData.brand,
        userId: updatedData.userId,
        vehicleTypeId: updatedData.vehicleTypeId,
      };

      setVehicle(transformed);
      setIsEditing(false);
      setShowConfirm(false);
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi cập nhật.");
    }
  };

  if (!vehicle) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-col flex-grow bg-gray-100">
          <Header title="Chi tiết Phương Tiện" />
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-lg">Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-grow relative">
        <Header title={`Chi tiết Phương Tiện #${vehicle.id}`} />
        <div className="p-6 overflow-y-auto">
          <div className="bg-white shadow rounded-lg p-6 max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 flex justify-between items-center">
              Thông tin phương tiện
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Pencil size={20} />
                </button>
              ) : (
                <div className="space-x-2">
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Lưu
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(vehicle.name);
                      setEditLicensePlate(vehicle.license_plate);
                      setEditColor(vehicle.color);
                      setEditBrand(vehicle.brand);
                      setEditUserId(vehicle.userId);
                      setEditVehicleTypeId(vehicle.vehicleTypeId);
                    }}
                    className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </h2>

            <div className="grid grid-cols-2 gap-4 text-gray-700">
              <div>
                <p className="font-semibold">ID:</p>
                <p>{vehicle.id}</p>
              </div>

              <div>
                <p className="font-semibold">Camera ghi nhận:</p>
                <p>{vehicle.camera?.name || "Không xác định"}</p>
              </div>

              <div>
                <p className="font-semibold">Tên phương tiện:</p>
                {isEditing ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border rounded px-2 py-1 w-full"
                  />
                ) : (
                  <p>{vehicle.name}</p>
                )}
              </div>

              <div>
                <p className="font-semibold">Biển số:</p>
                {isEditing ? (
                  <input
                    value={editLicensePlate}
                    onChange={(e) => setEditLicensePlate(e.target.value)}
                    className="border rounded px-2 py-1 w-full"
                  />
                ) : (
                  <p>{vehicle.license_plate}</p>
                )}
              </div>

              <div>
                <p className="font-semibold">Loại xe (ID):</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editVehicleTypeId}
                    onChange={(e) => setEditVehicleTypeId(Number(e.target.value))}
                    className="border rounded px-2 py-1 w-full"
                  />
                ) : (
                  <p>{vehicle.vehicleTypeId}</p>
                )}
              </div>

              <div>
                <p className="font-semibold">Người dùng (userId):</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editUserId}
                    onChange={(e) => setEditUserId(Number(e.target.value))}
                    className="border rounded px-2 py-1 w-full"
                  />
                ) : (
                  <p>{vehicle.userId}</p>
                )}
              </div>

              <div>
                <p className="font-semibold">Hãng:</p>
                {isEditing ? (
                  <input
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="border rounded px-2 py-1 w-full"
                  />
                ) : (
                  <p>{vehicle.brand}</p>
                )}
              </div>

              <div>
                <p className="font-semibold">Màu sắc:</p>
                {isEditing ? (
                  <input
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="border rounded px-2 py-1 w-full"
                  />
                ) : (
                  <p>{vehicle.color}</p>
                )}
              </div>

              <div className="col-span-2">
                <p className="font-semibold">Mô tả:</p>
                <p>{vehicle.description || "Không có mô tả."}</p>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Ảnh phương tiện:</p>
              <img
                src={vehicle.image_url}
                alt="Ảnh phương tiện"
                className="rounded-lg shadow w-full max-h-[400px] object-contain"
              />
            </div>
          </div>
        </div>

        {/* Modal xác nhận */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full space-y-4">
              <p className="text-lg font-semibold">Xác nhận lưu thay đổi?</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
