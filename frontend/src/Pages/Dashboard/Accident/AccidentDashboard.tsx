import { useEffect, useState } from "react";
import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";
import { Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CameraType {
  id: number;
  name: string;
  location: string;
  stream_url: string;
  status: boolean;
  latitude: number;
  longitude: number;
  thumbnail: string | null;
  created_at: string;
}

interface AccidentType {
  id: number;
  camera: CameraType;
  image_url: string;
  description: string;
  videoUrl: string;
  location: string;
  accident_time: string;
  createdAt: string;
}

export default function AccidentDashboard() {
  const [accidents, setAccidents] = useState<AccidentType[]>([]);
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<number | "all">("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8081/api/accident")
      .then((res) => res.json())
      .then((data) => {
        const updatedAccidents = data.map((acc: AccidentType) => ({
          ...acc,
          status: acc.videoUrl ? "verified" : "pending", // gán trạng thái tạm thời từ videoUrl
        }));
        setAccidents(updatedAccidents);
      })
      .catch(console.error);

    fetch("http://localhost:8000/api/cameras")
      .then((res) => res.json())
      .then(setCameras)
      .catch(console.error);
  }, []);

  const filteredAccidents =
    selectedCameraId === "all"
      ? accidents
      : accidents.filter((acc) => acc.camera.id === selectedCameraId);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa tai nạn này?")) return;

    try {
      const res = await fetch(`http://localhost:8081/api/accident/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAccidents((prev) => prev.filter((acc) => acc.id !== id));
        alert(`Đã xóa tai nạn ID: ${id}`);
      } else {
        alert("Xóa tai nạn thất bại.");
      }
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi xóa tai nạn.");
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-grow">
        <Header title="Quản lý Tai Nạn Giao Thông" />

        <div className="p-4">
          <div className="mb-4 flex items-center gap-4">
            <label className="font-medium">Lọc theo camera:</label>
            <select
              className="border border-gray-300 px-3 py-2 rounded"
              value={selectedCameraId}
              onChange={(e) =>
                setSelectedCameraId(e.target.value === "all" ? "all" : Number(e.target.value))
              }
            >
              <option value="all">Tất cả</option>
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded shadow bg-white">
            <table className="min-w-full table-auto border">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3 border">ID</th>
                  <th className="p-3 border">Camera</th>
                  <th className="p-3 border">Vị trí</th>
                  <th className="p-3 border">Thời gian</th>
                  <th className="p-3 border">Trạng thái</th>
                  <th className="p-3 border">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccidents.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50">
                    <td className="p-3 border">{acc.id}</td>
                    <td className="p-3 border">{acc.camera.name}</td>
                    <td className="p-3 border">{acc.location}</td>
                    <td className="p-3 border">
                      {new Date(acc.accident_time).toLocaleString()}
                    </td>
                    <td className="p-3 border">
                      {acc.videoUrl ? (
                        <span className="text-green-600 font-medium">Đã xác minh</span>
                      ) : (
                        <span className="text-yellow-600 font-medium">Pending</span>
                      )}
                    </td>
                    <td className="p-3 border">
                      <div className="flex gap-3">
                        <button
                          title="Xem chi tiết"
                          onClick={() => navigate(`/accidents/${acc.id}`)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          title="Xóa"
                          onClick={() => handleDelete(acc.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAccidents.length === 0 && (
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
