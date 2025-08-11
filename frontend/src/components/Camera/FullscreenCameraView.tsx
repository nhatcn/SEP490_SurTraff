import { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, Settings,  MapPin, Clock, Circle } from 'lucide-react';

interface CameraProps {
  id: string | number;
  name: string;
  location: string;
  status: string;
  thumbnail?: string;
  description?: string;
}

interface FullscreenCameraViewProps {
  camera: CameraProps;
  onClose: () => void;
}

export default function FullscreenCameraView({ camera, onClose }: FullscreenCameraViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const processedVideoUrl = `http://localhost:8000/api/video/${camera.id}`;

  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onMouseMove={() => setShowControls(true)}
    >
      {/* Top Controls Bar */}
      <div className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">{camera.name}</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <MapPin size={16} />
              <span>{camera.location}</span>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              camera.status === "violation" 
                ? "bg-red-600 text-white" 
                : "bg-green-600 text-white"
            }`}>
              {camera.status === "violation" ? "Violation Detected" : "Normal"}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <Clock size={16} />
              <span>{currentTime.toLocaleTimeString()}</span>
            </div>
            <button
              onClick={() => setShowControls(!showControls)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Toggle Controls"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 flex items-center justify-center relative">
        <img
          src={processedVideoUrl}
          alt={`Livestream from ${camera.name}`}
          className="max-w-full max-h-full object-contain"
        />
        
        {/* Live Indicator */}
        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-lg">
          <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
          LIVE
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-lg animate-pulse">
            <Circle size={16} fill="white" />
            REC
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-4 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}>
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={toggleFullscreen}
            className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* Camera Info Overlay */}
      {camera.description && (
        <div className={`absolute bottom-20 left-4 max-w-md bg-black/50 backdrop-blur-sm text-white p-4 rounded-lg transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <h3 className="font-semibold mb-2">Camera Information</h3>
          <p className="text-sm text-gray-300">{camera.description}</p>
        </div>
      )}
    </div>
  );
}
