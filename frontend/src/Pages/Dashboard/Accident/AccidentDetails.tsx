import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";

interface AccidentType {
  id: number;
  camera: {
    id: number;
    name: string;
  };
  image_url: string;
  description: string;
  videoUrl: string;
  location: string;
  accident_time: string;
  created_at: string;
}

export default function AccidentDetail() {
  const { id } = useParams();
  const [accident, setAccident] = useState<AccidentType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:8081/api/accident/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setAccident(data);
        setEditDescription(data.description || "");
      })
      .catch(console.error);
  }, [id]);

  const handleSave = async () => {
    if (!accident) return;

    try {
      const updatedAccident = {
        description: editDescription,
      };

      const res = await fetch(`http://localhost:8081/api/accident/${accident.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedAccident),
      });

      if (!res.ok) {
        alert("Cập nhật mô tả thất bại");
        return;
      }

      const updatedData = await res.json();
      setAccident(updatedData);
      setIsEditing(false);
      setShowConfirm(false);
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi cập nhật mô tả.");
    }
  };

  if (!accident) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-col flex-grow bg-gray-100">
          <Header title="Chi tiết Tai Nạn" />
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
        <Header title={`Chi tiết Tai Nạn #${accident.id}`} />
        <div className="p-6 overflow-y-auto">
          <div className="bg-white shadow rounded-lg p-6 max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 flex justify-between items-center">
              Thông tin vụ tai nạn
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
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditDescription(accident.description || "");
                    }}
                    className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </h2>

            <div className="grid grid-cols-2 gap-4 text-gray-700">
              <div>
                <p className="font-semibold">Mã tai nạn:</p>
                <p>{accident.id}</p>
              </div>

              <div>
                <p className="font-semibold">Camera ghi nhận:</p>
                <p>{accident.camera.name}</p>
              </div>

              <div>
                <p className="font-semibold">Thời gian xảy ra:</p>
                <p>{new Date(accident.accident_time).toLocaleString()}</p>
              </div>

              <div>
                <p className="font-semibold">Thời gian ghi nhận:</p>
                <p>{new Date(accident.created_at).toLocaleString()}</p>
              </div>

              <div className="col-span-2">
                <p className="font-semibold">Vị trí:</p>
                <p>{accident.location}</p>
              </div>

              <div className="col-span-2">
                <p className="font-semibold">Mô tả:</p>
                {isEditing ? (
                  <textarea
                    rows={4}
                    className="border rounded px-2 py-1 w-full"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Nhập mô tả tai nạn"
                  />
                ) : (
                  <p>{accident.description || "Không có mô tả."}</p>
                )}
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Ảnh tai nạn:</p>
              <img
                src={accident.image_url}
                alt="Ảnh tai nạn"
                className="rounded-lg shadow w-full max-h-[400px] object-contain"
              />
            </div>

            <div>
              <p className="font-semibold mb-2">Video tai nạn:</p>
              {accident.videoUrl ? (
                <video
                  src={accident.videoUrl}
                  controls
                  className="w-full max-h-[400px] rounded-lg shadow"
                />
              ) : (
                <p className="text-gray-500 italic">Không có video cho vụ tai nạn này.</p>
              )}
            </div>
          </div>
        </div>

        {/* Confirm modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full space-y-4">
              <p className="text-lg font-semibold">Xác nhận lưu thay đổi?</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
