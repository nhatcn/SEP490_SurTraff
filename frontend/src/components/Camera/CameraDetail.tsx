import { MapPin } from "lucide-react";

interface CameraProps {
  id: string | number;
  name: string;
  location: string;
  status: string;
  thumbnail?: string;
  description?: string;
}

interface CameraDetailProps {
  camera: CameraProps | null;
}

export default function CameraDetail({ camera }: CameraDetailProps) {
  if (!camera) {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col border border-gray-200">
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 border border-dashed border-gray-300 rounded-xl">
          <div className="text-center text-gray-500 p-8 animate-pulse">
            <div className="inline-block mb-4 opacity-30 animate-bounce">
              <MapPin size={48} />
            </div>
            <h3 className="text-xl font-medium mb-2">Chưa chọn camera</h3>
            <p className="text-gray-500">Vui lòng chọn một camera từ danh sách để xem chi tiết</p>
          </div>
        </div>
      </div>
    );
  }

  const processedVideoUrl = `http://localhost:8000/api/video/${camera.id}`;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col border border-gray-200 hover:shadow-lg transition-shadow duration-300">
      <div className="relative bg-black h-96 flex items-center justify-center overflow-hidden">
        {processedVideoUrl ? (
          <img
            src={processedVideoUrl}
            alt={`Livestream from ${camera.name}`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-gray-500 text-center p-8 bg-opacity-5 bg-gray-600 rounded-lg w-4/5">
            Không có video để hiển thị
          </div>
        )}
        
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1.5 shadow-md">
          <span className="inline-block w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
          LIVE
        </div>
      </div>

      <div className="p-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 relative inline-block pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-10 after:h-0.5 after:bg-gradient-to-r after:from-blue-500 after:to-blue-700 after:rounded">
            {camera.name}
          </h2>
          <div className={`
            px-3 py-1 rounded-full text-xs font-semibold
            ${camera.status === "violation" 
              ? "bg-gradient-to-r from-red-50 to-red-100 text-red-700 shadow-sm shadow-red-100" 
              : "bg-gradient-to-r from-green-50 to-green-100 text-green-700 shadow-sm shadow-green-100"}
          `}>
            {camera.status === "violation" ? "Vi phạm phát hiện" : "Bình thường"}
          </div>
        </div>

        <div className="flex items-center text-gray-500 mb-5 bg-gray-50 p-3 rounded-lg">
          <MapPin size={18} className="mr-1.5" />
          {camera.location || "Không có vị trí"}
        </div>

        <div className="text-gray-700 mb-6 bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500 leading-relaxed">
          <span className="font-medium">Mô tả:</span> {camera.description || "Camera này được lắp đặt để phát hiện người."}
        </div>
        
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium shadow-md shadow-blue-100 hover:translate-y-[-2px] hover:shadow-lg transition-all duration-300">
            Xem lịch sử
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium border border-gray-200 hover:bg-gray-200 hover:translate-y-[-2px] transition-all duration-300">
            Cấu hình
          </button>
        </div>
      </div>
    </div>
  );
}