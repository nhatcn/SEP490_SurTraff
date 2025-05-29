import { useEffect, useState } from "react";
import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";
import { Pencil, Trash2 } from "lucide-react";

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
  accident_id: number;
  camera: {
    id: number;
    name: string;
    location: string;
    latitude: number;
    longitude: number;
    streamUrl: string;
    thumbnail: string;
    status: string;
    createdAt: string;
  };
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccident, setSelectedAccident] = useState<AccidentType | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState<number | "all">("all");

  useEffect(() => {
    // Fetch accidents
    fetch("http://localhost:8081/api/accident/list")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch accidents");
        return res.json();
      })
      .then((data) => {
        setAccidents(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // Fetch cameras
    fetch("http://localhost:8000/api/cameras")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch cameras");
        return res.json();
      })
      .then((data) => {
        setCameras(data);
      })
      .catch((err) => {
        // Có thể set lỗi riêng cho cameras nếu muốn
        console.error("Error loading cameras:", err);
      });
  }, []);

  // Reset selectedAccident khi đổi filter camera
  useEffect(() => {
    setSelectedAccident(null);
  }, [selectedCameraId]);

  // Lọc tai nạn theo camera
  const filteredAccidents =
    selectedCameraId === "all"
      ? accidents
      : accidents.filter((acc) => acc.camera.id === selectedCameraId);

  const handleEdit = (accident: AccidentType) => {
    alert(`Edit accident id: ${accident.accident_id}`);
  };

  const handleDelete = (accident: AccidentType) => {
    if (window.confirm(`Bạn có chắc muốn xóa tai nạn id: ${accident.accident_id}?`)) {
      alert("Xóa tai nạn (giả lập)");
    }
  };

  const handleShowVideo = () => {
    setShowVideo(true);
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Accident Records" />
        <div className="flex flex-grow overflow-hidden p-4 gap-6">
          <div className="w-2/5 overflow-y-auto border-r pr-4">
            {/* Lọc theo camera */}
            <div className="mb-4">
              <label htmlFor="cameraFilter" className="block mb-1 font-semibold">
                Filter:
              </label>
              <select
                id="cameraFilter"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedCameraId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCameraId(val === "all" ? "all" : Number(val));
                }}
              >
                <option value="all">Tất cả camera</option>
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.name}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : error ? (
              <div className="text-red-600 text-center">{error}</div>
            ) : filteredAccidents.length === 0 ? (
              <div className="text-center text-gray-500 py-12">Không có tai nạn nào được ghi nhận.</div>
            ) : (
              <ul>
                {filteredAccidents.map((accident) => (
                  <li
                    key={accident.accident_id}
                    onClick={() => {
                      setSelectedAccident(accident);
                      setShowVideo(false);
                    }}
                    className={`cursor-pointer p-3 mb-2 rounded border transition-colors duration-300 ${
                      selectedAccident?.accident_id === accident.accident_id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <div>
                      <h3 className="font-semibold">
                        {accident.camera.name} - {accident.location}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(accident.accident_time).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="w-3/5 overflow-y-auto p-4 bg-white rounded shadow">
            {selectedAccident ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">
                    Chi tiết tai nạn: {selectedAccident.camera.name} - {selectedAccident.location}
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEdit(selectedAccident)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(selectedAccident)}
                      className="text-red-600 hover:text-red-800"
                      title="Xóa"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <p className="mb-2">
                  <strong>Thời gian tai nạn:</strong>{" "}
                  {new Date(selectedAccident.accident_time).toLocaleString()}
                </p>
                <p className="mb-4">
                  <strong>Mô tả:</strong> {selectedAccident.description}
                </p>

                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Ảnh bổ sung:</h3>
                  <img
                    src={selectedAccident.image_url}
                    alt="Accident supplemental"
                    className="w-full max-h-64 object-cover rounded"
                  />
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Video tai nạn:</h3>
                  {!showVideo ? (
                    <button
                      onClick={handleShowVideo}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Xem video
                    </button>
                  ) : selectedAccident.videoUrl ? (
                    <video
                      controls
                      className="w-full max-h-[400px] rounded shadow mt-3"
                      src={selectedAccident.videoUrl}
                    >
                      Trình duyệt của bạn không hỗ trợ video.
                    </video>
                  ) : (
                    <p className="text-gray-500">Không có video để hiển thị.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-center text-gray-500">Chọn một tai nạn để xem chi tiết.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
