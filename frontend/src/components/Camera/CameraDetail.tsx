import { MapPin, Maximize2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FullscreenCameraView from "./FullscreenCameraView";

interface CameraProps {
  id: string | number;
  name: string;
  location: string;
  status: string;
  thumbnail?: string;
  description?: string;
  violation_type_id?: number;
}

interface CameraDetailProps {
  camera: CameraProps | null;
}

export default function CameraDetail({ camera }: CameraDetailProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const navigate = useNavigate();

  const handleConfigClick = () => {
    if (camera?.id) {
      navigate(`/cameras/edit/${camera.id}`);
    }
  };

  const getViolationDescription = (violationTypeId?: number): string => {
    switch (violationTypeId) {
      case 1:
        return "This camera is installed for red light violation detection.";
      case 2:
        return "This camera is installed for overspeed detection.";
      case 3:
        return "This camera is installed for illegal parking detection.";
      case 4:
        return "This camera is installed for wrong way detection.";
      case 5:
        return "This camera is installed for no helmet violation detection.";
      case 6:
        return "This camera is installed for traffic density monitoring.";
      case 7:
        return "This camera is installed for obstacle detection.";
      default:
        return "This camera is installed for general traffic monitoring.";
    }
  };

  if (!camera) {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col border border-gray-200">
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 border border-dashed border-gray-300 rounded-xl">
          <div className="text-center text-gray-500 p-8 animate-pulse">
            <div className="inline-block mb-4 opacity-30 animate-bounce">
              <MapPin size={48} />
            </div>
            <h3 className="text-xl font-medium mb-2">No Camera Selected</h3>
            <p className="text-gray-500">Please select a camera from the list to view details</p>
          </div>
        </div>
      </div>
    );
  }

  const processedVideoUrl = `http://localhost:8000/api/video/${camera.id}`;

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col border border-gray-200 hover:shadow-lg transition-shadow duration-300">
        <div className="relative bg-black h-96 flex items-center justify-center overflow-hidden group">
          {/* Show thumbnail first, then video when loaded */}
          {!videoLoaded && !videoError && camera.thumbnail && (
            <img
              src={camera.thumbnail}
              alt={`Thumbnail for ${camera.name}`}
              className="w-full h-full object-cover"
            />
          )}
          
          {processedVideoUrl && !videoError ? (
            <img
              src={processedVideoUrl}
              alt={`Livestream from ${camera.name}`}
              className={`w-full h-full object-contain transition-opacity duration-500 ${
                videoLoaded ? 'opacity-100' : 'opacity-0 absolute'
              }`}
              onLoad={() => setVideoLoaded(true)}
              onError={() => setVideoError(true)}
            />
          ) : null}
          
          {/* Fallback when no video and no thumbnail */}
          {(videoError || !processedVideoUrl) && !camera.thumbnail && (
            <div className="text-gray-500 text-center p-8 bg-opacity-5 bg-gray-600 rounded-lg w-4/5">
              No video or thumbnail available
            </div>
          )}

          {/* Loading indicator when video is loading but thumbnail exists */}
          {!videoLoaded && !videoError && camera.thumbnail && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white bg-opacity-90 rounded-lg p-3 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                <span className="text-sm text-gray-700">Loading live stream...</span>
              </div>
            </div>
          )}
          
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1.5 shadow-md">
            <span className={`inline-block w-2 h-2 rounded-full animate-pulse ${
              videoLoaded ? 'bg-red-600' : 'bg-gray-400'
            }`}></span>
            {videoLoaded ? 'LIVE' : 'LOADING'}
          </div>

          {/* Fullscreen Button Overlay */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
            title="View Fullscreen"
          >
            <Maximize2 size={20} />
          </button>
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
              {camera.status === "violation" ? "Violation Detected" : "Normal"}
            </div>
          </div>

          <div className="flex items-center text-gray-500 mb-5 bg-gray-50 p-3 rounded-lg">
            <MapPin size={18} className="mr-1.5" />
            {camera.location || "No location"}
          </div>

          <div className="text-gray-700 mb-6 bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500 leading-relaxed">
            <span className="font-medium">Description:</span> {camera.description || getViolationDescription(camera.violation_type_id)}
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setIsFullscreen(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium shadow-md shadow-purple-100 hover:translate-y-[-2px] hover:shadow-lg transition-all duration-300 flex items-center gap-2"
            >
              <Maximize2 size={16} />
              View Fullscreen
            </button>

            <button 
              onClick={handleConfigClick}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium border border-gray-200 hover:bg-gray-200 hover:translate-y-[-2px] transition-all duration-300"
            >
              Configure
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <FullscreenCameraView 
          camera={camera} 
          onClose={() => setIsFullscreen(false)} 
        />
      )}
    </>
  );
}
