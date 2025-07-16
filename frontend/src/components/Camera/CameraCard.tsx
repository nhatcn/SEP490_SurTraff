import { Camera, MapPin, Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { useState, useEffect } from "react";

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
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };
  
  const getStatusConfig = () => {
    switch (camera.status) {
      case "violation":
        return {
          color: "from-red-500 to-red-600",
          bgColor: "bg-red-50",
          textColor: "text-red-700",
          icon: AlertTriangle,
          label: "Violation Detected",
          pulseColor: "bg-red-400",
          dotColor: "bg-red-500"
        };
      case "active":
      case "normal":
        return {
          color: "from-green-500 to-green-600",
          bgColor: "bg-green-50",
          textColor: "text-green-700",
          icon: CheckCircle,
          label: "Active",
          pulseColor: "bg-green-400",
          dotColor: "bg-green-500"
        };
      case "inactive":
        return {
          color: "from-gray-400 to-gray-500",
          bgColor: "bg-gray-50",
          textColor: "text-gray-600",
          icon: WifiOff,
          label: "Inactive",
          pulseColor: "bg-gray-400",
          dotColor: "bg-gray-400"
        };
      default:
        return {
          color: "from-blue-500 to-blue-600",
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          icon: Wifi,
          label: "Online",
          pulseColor: "bg-blue-400",
          dotColor: "bg-blue-500"
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  
  return (
    <div 
      className={`
        relative bg-white/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden cursor-pointer 
        transition-all duration-300 border h-full flex flex-col group
        hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1
        ${isSelected 
          ? "border-blue-500 shadow-blue-200 ring-2 ring-blue-100" 
          : "border-gray-200 hover:border-blue-300"
        }
      `}
      onClick={() => onClick(camera)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Badge */}
      <div className={`absolute top-2 right-2 z-10 px-2 py-1 rounded-lg text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor} shadow-sm border border-white/50`}>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${statusConfig.dotColor} relative`}>
            {camera.status === "violation" && (
              <span className={`absolute inset-[-2px] rounded-full animate-ping opacity-75 ${statusConfig.pulseColor}`}></span>
            )}
          </div>
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Image Section - Reduced height */}
      <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 h-36 flex items-center justify-center overflow-hidden">
        {imageError || !camera.thumbnail ? (
          <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center text-gray-400">
            <div className="relative">
              <Camera size={32} className="mb-2 opacity-60" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <span className="text-xs text-center px-4 font-medium">Camera Offline</span>
          </div>
        ) : (
          <>
            <img 
              src={camera.thumbnail || "/placeholder.svg"}
              alt={camera.name} 
              className={`w-full h-full object-cover transition-all duration-500 ${
                isHovered ? "scale-110 brightness-110" : "scale-100"
              }`}
              onError={() => setImageError(true)}
            />
            {/* Live Indicator */}
            <div className="absolute bottom-2 left-2 bg-red-600 text-white px-2 py-0.5 rounded text-xs font-semibold flex items-center space-x-1 shadow-lg">
              <span className="inline-block w-1 h-1 bg-white rounded-full animate-pulse"></span>
              <span>LIVE</span>
            </div>
          </>
        )}

        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-black/20 backdrop-blur-[1px] transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 transform transition-transform duration-300 hover:scale-110">
              <Camera size={20} className="text-gray-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Section - Reduced padding */}
      <div className="p-3 flex-grow flex flex-col bg-gradient-to-b from-white to-gray-50/30">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-bold text-gray-800 leading-tight group-hover:text-blue-600 transition-colors truncate pr-2">
            {camera.name}
          </h3>
          <StatusIcon size={18} className={`${statusConfig.textColor} flex-shrink-0`} />
        </div>

        {/* Location */}
        <div className="flex items-center text-gray-500 mb-3 bg-gray-50 px-2 py-1.5 rounded-lg">
          <MapPin size={14} className="mr-2 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium truncate">{camera.location}</span>
        </div>

        {/* Status Bar */}
        <div className="mt-auto pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${statusConfig.color} shadow-sm`}></div>
              <span className="text-xs font-mono text-gray-500">
                {formatDateTime(currentTime)}
              </span>
            </div>
            
            <div className="flex items-center space-x-1 text-gray-400">
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

// Demo Component
function Demo() {
  const [selectedCamera, setSelectedCamera] = useState<CameraProps | null>(null);

  const sampleCameras: CameraProps[] = [
    {
      id: 1,
      name: "Camera Lối Vào Chính",
      location: "Tầng 1 - Sảnh A",
      status: "active",
      thumbnail: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=200&fit=crop"
    },
    {
      id: 2,
      name: "Camera Hành Lang",
      location: "Tầng 2 - Khu B",
      status: "violation",
      thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=200&fit=crop"
    },
    {
      id: 3,
      name: "Camera Bãi Đậu Xe",
      location: "Tầng Hầm B1",
      status: "inactive",
      thumbnail: ""
    },
    {
      id: 4,
      name: "Camera Văn Phòng",
      location: "Tầng 3 - Phòng 301",
      status: "normal",
      thumbnail: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=300&h=200&fit=crop"
    }
  ];

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Camera Security Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sampleCameras.map((camera) => (
            <CameraCard
              key={camera.id}
              camera={camera}
              isSelected={selectedCamera?.id === camera.id}
              onClick={(camera) => setSelectedCamera(camera)}
            />
          ))}
        </div>
        
        {selectedCamera && (
          <div className="mt-8 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Selected Camera: {selectedCamera.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-600">Location:</span>
                <span className="ml-2 text-gray-800">{selectedCamera.location}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Status:</span>
                <span className="ml-2 text-gray-800 capitalize">{selectedCamera.status}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}