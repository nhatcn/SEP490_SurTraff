import { Camera } from "lucide-react";
import { useState } from "react";

interface CameraProps {
  id: string | number;
  name: string;
  location: string;
  status: string;
  thumbnail: string;
}

interface CameraCardProps {
  camera: CameraProps;
  isSelected: boolean;
  onClick: (camera: CameraProps) => void;
}

export default function CameraCard({ camera, isSelected, onClick }: CameraCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`
        bg-white rounded-xl shadow-md overflow-hidden cursor-pointer transition-all 
        duration-300 border border-gray-200 h-full flex flex-col
        hover:translate-y-[-5px] hover:shadow-lg
        ${isSelected ? "border-2 border-blue-500 shadow-blue-100" : ""}
      `}
      onClick={() => onClick(camera)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative bg-gray-100 h-40 flex items-center justify-center overflow-hidden">
        <img 
          src={camera.thumbnail} 
          alt={camera.name} 
          className={`w-full h-full object-cover transition-transform duration-500 ${isHovered ? "scale-105" : ""}`}
        />
      </div>

      <div className="p-4 flex-grow flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800 m-0">{camera.name}</h3>
          <div className={`
            w-2 h-2 rounded-full relative 
            ${camera.status === "violation" ? "bg-red-500" : "bg-green-500"}
          `}>
            <span className={`
              absolute inset-[-2px] rounded-full animate-ping opacity-75
              ${camera.status === "violation" ? "bg-red-400" : "bg-green-400"}
            `}></span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-2 flex items-center before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:bg-gray-400 before:rounded-full before:mr-1.5">
          {camera.location}
        </p>

        <div className="flex items-center text-xs mt-auto pt-2 border-t border-dashed border-gray-200">
          <span className={`font-semibold ${camera.status === "violation" ? "text-red-600" : "text-green-600"}`}>
            Trạng thái: {camera.status === "violation" ? "Vi phạm phát hiện" : "Bình thường"}
          </span>
          <Camera size={14} className={`ml-auto text-gray-400 transition-transform ${isHovered ? "rotate-12" : ""}`} />
        </div>
      </div>
    </div>
  );
}