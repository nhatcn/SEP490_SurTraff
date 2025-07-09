import { Camera, MapPin, Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
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
  const [imageError, setImageError] = useState(false);
  
  const getStatusConfig = () => {
    switch (camera.status) {
      case "violation":
        return {
          color: "from-red-500 to-red-600",
          bgColor: "bg-red-50",
          textColor: "text-red-700",
          icon: AlertTriangle,
          label: "Violation Detected",
          pulseColor: "bg-red-400"
        };
      case "active":
      case "normal":
        return {
          color: "from-green-500 to-green-600",
          bgColor: "bg-green-50",
          textColor: "text-green-700",
          icon: CheckCircle,
          label: "Active",
          pulseColor: "bg-green-400"
        };
      case "inactive":
        return {
          color: "from-gray-400 to-gray-500",
          bgColor: "bg-gray-50",
          textColor: "text-gray-600",
          icon: WifiOff,
          label: "Inactive",
          pulseColor: "bg-gray-400"
        };
      default:
        return {
          color: "from-blue-500 to-blue-600",
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          icon: Wifi,
          label: "Online",
          pulseColor: "bg-blue-400"
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  
  return (
    <div 
      className={`
        relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden cursor-pointer 
        transition-all duration-500 border-2 h-full flex flex-col group
        hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1
        ${isSelected 
          ? "border-blue-500 shadow-blue-200 ring-4 ring-blue-100" 
          : "border-white/50 hover:border-blue-300"
        }
      `}
      onClick={() => onClick(camera)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Indicator Overlay */}
      <div className={`absolute top-3 right-3 z-10 px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor} shadow-sm border border-white/50`}>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${statusConfig.color.replace('from-', 'bg-').replace(' to-red-600', '').replace(' to-green-600', '').replace(' to-gray-500', '').replace(' to-blue-600', '')} relative`}>
            {camera.status === "violation" && (
              <span className={`absolute inset-[-2px] rounded-full animate-ping opacity-75 ${statusConfig.pulseColor}`}></span>
            )}
          </div>
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Image Section */}
      <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 h-48 flex items-center justify-center overflow-hidden">
        {imageError || !camera.thumbnail ? (
          <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center text-gray-400">
            <div className="relative">
              <Camera size={40} className="mb-3 opacity-60" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <span className="text-sm text-center px-4 font-medium">Camera Offline</span>
          </div>
        ) : (
          <>
            <img 
              src={camera.thumbnail || "/placeholder.svg"}
              alt={camera.name} 
              className={`w-full h-full object-cover transition-all duration-700 ${
                isHovered ? "scale-110 brightness-110" : "scale-100"
              }`}
              onError={() => setImageError(true)}
            />
            {/* Live Overlay */}
            <div className="absolute bottom-3 left-3 bg-red-600 text-white px-2 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 shadow-lg">
              <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              <span>LIVE</span>
            </div>
          </>
        )}

        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-black/20 backdrop-blur-[1px] transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 transform transition-transform duration-300 hover:scale-110">
              <Camera size={24} className="text-gray-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-grow flex flex-col bg-gradient-to-b from-white to-gray-50/50">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-800 leading-tight group-hover:text-blue-600 transition-colors">
            {camera.name}
          </h3>
          <StatusIcon size={20} className={`${statusConfig.textColor} flex-shrink-0 ml-2`} />
        </div>

        <div className="flex items-center text-gray-500 mb-4 bg-gray-50 px-3 py-2 rounded-lg">
          <MapPin size={16} className="mr-2 text-gray-400" />
          <span className="text-sm font-medium truncate">{camera.location}</span>
        </div>

        {/* Enhanced Status Bar */}
        <div className="mt-auto pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${statusConfig.color} shadow-sm`}></div>
              <span className={`text-sm font-semibold ${statusConfig.textColor}`}>
                {statusConfig.label}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 text-gray-400">
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute inset-0 bg-blue-500/5 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  );
}
