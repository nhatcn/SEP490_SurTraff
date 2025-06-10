import { useEffect, useState } from "react";
import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";
import { Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VehicleType {
  id: number;
  name: string;
  licensePlate: string;
  userId: number;
  vehicleTypeId: number;
  color: string;
  brand: string;
}

export default function VehicleDashboard() {
  const [vehicles, setVehicles] = useState<VehicleType[]>([]);
  const [selectedName, setSelectedName] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8081/api/vehicle")
      .then((res) => res.json())
      .then((data) => setVehicles(data))
      .catch((err) => console.error("Lỗi khi gọi API:", err));
  }, []);

  const filteredVehicles =
    selectedName === "all"
      ? vehicles
      : vehicles.filter((v) => v.name === selectedName);

  const uniqueVehicleNames = Array.from(new Set(vehicles.map((v) => v.name)));

  const handleDelete = async (id: number) => {
  const confirmed = window.confirm("Bạn có chắc muốn xóa phương tiện này?");
  if (!confirmed) return;

  try {
    const res = await fetch(`http://localhost:8081/api/vehicle/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Xóa không thành công");
    }

    setVehicles((prev) => prev.filter((v) => v.id !== id));
    alert(`Đã xóa phương tiện ID: ${id}`);
  } catch (error) {
    console.error(error);
    alert("Có lỗi khi xóa phương tiện.");
  }
};


  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-grow">
        <Header title="Quản lý Phương Tiện" />

        <div className="p-4">
          <div className="mb-4 flex items-center gap-4">
            <label className="font-medium">Lọc theo tên xe:</label>
            <select
              className="border border-gray-300 px-3 py-2 rounded"
              value={selectedName}
              onChange={(e) => setSelectedName(e.target.value)}
            >
              <option value="all">Tất cả</option>
              {uniqueVehicleNames.map((name, idx) => (
                <option key={idx} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded shadow bg-white">
            <table className="min-w-full table-auto border">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3 border">ID</th>
                  <th className="p-3 border">Tên xe</th>
                  <th className="p-3 border">Biển số</th>
                  <th className="p-3 border">Màu</th>
                  <th className="p-3 border">Hãng</th>
                  <th className="p-3 border">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="p-3 border">{v.id}</td>
                    <td className="p-3 border">{v.name}</td>
                    <td className="p-3 border">{v.licensePlate}</td>
                    <td className="p-3 border">{v.color}</td>
                    <td className="p-3 border">{v.brand}</td>
                    <td className="p-3 border">
                      <div className="flex gap-3">
                        <button
                          title="Xem chi tiết"
                          onClick={() => navigate(`/vehicles/${v.id}`)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          title="Xóa"
                          onClick={() => handleDelete(v.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500 py-6">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
