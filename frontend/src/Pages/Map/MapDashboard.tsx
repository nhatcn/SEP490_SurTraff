import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  ZoomControl,
  Tooltip
} from "react-leaflet";
import L, { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import Sidebar from "../../components/Layout/Sidebar";
import Header from "../../components/Layout/Header";
import CameraDetail from "../../components/Camera/CameraDetail";
import { API_URL_FAST, API_URL_BE } from "../../components/Link/LinkAPI";

// Camera type
interface CameraType {
  id: number;
  name: string;
  location: string;
  status: string;
  latitude: number;
  ip_address: string;
  stream_url: string;
  longitude: number;
  thumbnail?: string;
  description?: string;
}

// Obstacle type - updated to match API response
interface ObstacleType {
  id: number;
  cameraId: number;
  cameraName: string;
  obstacleType: string;
  imageUrl?: string;
  location?: string;
  detectionTime: string;
  createdAt: string;
  latitude: number;
  longitude: number;
}

// Camera icon
const cameraIcon: Icon = new L.Icon({
  iconUrl:
    "https://tse3.mm.bing.net/th/id/OIP.rDwv7jSrMyrexUsSSdYd8wHaHa?rs=1&pid=ImgDetMain",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Camera with obstacle icon
const cameraWithObstacleIcon: Icon = new L.Icon({
  iconUrl:
    "https://tse3.mm.bing.net/th/id/OIP.rDwv7jSrMyrexUsSSdYd8wHaHa?rs=1&pid=ImgDetMain",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// User location icon
const userLocationIcon: Icon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/447/447031.png",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Status color
const statusColors: Record<string, string> = {
  online: "#4CAF50",
  offline: "#F44336",
  warning: "#FF9800",
};

export default function MapDashboard() {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [obstacles, setObstacles] = useState<ObstacleType[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<CameraType | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.75, 106.67]);
  const [mapZoom, setMapZoom] = useState<number>(6);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const mapRef = useRef<L.Map | null>(null);

  // Add CSS styles for obstacles effect and popup styling
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .has-obstacles .leaflet-marker-icon {
        border: 3px solid #ef4444 !important;
        border-radius: 50% !important;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.6) !important;
      }

      /* Custom popup styling */
      .leaflet-popup-content-wrapper {
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
        border: 1px solid rgba(226, 232, 240, 0.5) !important;
        padding: 0 !important;
        overflow: hidden !important;
      }

      .leaflet-popup-content {
        margin: 0 !important;
        padding: 0 !important;
        width: auto !important;
        max-width: 420px !important;
        min-width: 380px !important;
        max-height: 500px !important;
        overflow: hidden !important;
      }

      .leaflet-popup-tip {
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
        border: 1px solid rgba(226, 232, 240, 0.5) !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
      }

      .leaflet-popup-close-button {
        color: #64748b !important;
        font-size: 18px !important;
        font-weight: bold !important;
        width: 24px !important;
        height: 24px !important;
        background: rgba(255, 255, 255, 0.9) !important;
        border-radius: 50% !important;
        right: 8px !important;
        top: 8px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        backdrop-filter: blur(4px) !important;
        border: 1px solid rgba(226, 232, 240, 0.5) !important;
        transition: all 0.2s ease !important;
        z-index: 1000 !important;
      }

      .leaflet-popup-close-button:hover {
        background: rgba(239, 68, 68, 0.1) !important;
        color: #ef4444 !important;
        transform: scale(1.1) !important;
      }

      /* Map container z-index control */
      .map-container-normal {
        z-index: 1;
      }

      .map-container-hidden {
        z-index: -1;
      }

      /* Scrollbar styling for obstacles list */
      .obstacles-scroll::-webkit-scrollbar {
        width: 4px;
      }

      .obstacles-scroll::-webkit-scrollbar-track {
        background: rgba(226, 232, 240, 0.2);
        border-radius: 4px;
      }

      .obstacles-scroll::-webkit-scrollbar-thumb {
        background: rgba(239, 68, 68, 0.4);
        border-radius: 4px;
        transition: background 0.2s ease;
      }

      .obstacles-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(239, 68, 68, 0.6);
      }

      /* Firefox scrollbar */
      .obstacles-scroll {
        scrollbar-width: thin;
        scrollbar-color: rgba(239, 68, 68, 0.4) rgba(226, 232, 240, 0.2);
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Get user's current location
  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation([lat, lng]);
        setMapCenter([lat, lng]);
        setMapZoom(13);
        setIsGettingLocation(false);

        // Fly to user location if map is available
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 13, { duration: 2 });
        }
      },
      (error) => {
        let errorMessage = "Unable to retrieve your location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        setLocationError(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Auto-get location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Listen for fullscreen events from CameraDetail
  useEffect(() => {
    const handleFullscreenOpen = () => setIsFullscreenOpen(true);
    const handleFullscreenClose = () => setIsFullscreenOpen(false);

    // Listen for custom events
    window.addEventListener("camera-fullscreen-open", handleFullscreenOpen);
    window.addEventListener("camera-fullscreen-close", handleFullscreenClose);

    return () => {
      window.removeEventListener(
        "camera-fullscreen-open",
        handleFullscreenOpen
      );
      window.removeEventListener(
        "camera-fullscreen-close",
        handleFullscreenClose
      );
    };
  }, []);

  // Fetch cameras data
  useEffect(() => {
    fetch(API_URL_FAST + "api/cameras")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch camera data");
        return res.json();
      })
      .then((data: CameraType[]) => {
        setCameras(data);
        setLoading(false);

        if (data.length > 0) {
          setSelectedCamera(data[0]);
          const validCoords = data.filter((c) => c.latitude && c.longitude);
          if (validCoords.length > 0) {
            const latSum = validCoords.reduce(
              (sum, cam) => sum + cam.latitude,
              0
            );
            const lngSum = validCoords.reduce(
              (sum, cam) => sum + cam.longitude,
              0
            );
            setMapCenter([
              latSum / validCoords.length,
              lngSum / validCoords.length,
            ]);
            setMapZoom(7);
          }
        }
      })
      .catch((err) => {
        console.error("Error loading cameras:", err);
        setError("Failed to load cameras. Please try again later.");
        setLoading(false);
      });
  }, []);

  // Fetch obstacles data
  useEffect(() => {
    fetch(API_URL_BE + "api/obstacles")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch obstacles data");
        return res.json();
      })
      .then((data: ObstacleType[]) => {
        console.log("Obstacles API response:", data); // Debug log
        setObstacles(data);
      })
      .catch((err) => {
        console.error("Error loading obstacles:", err);
      });
  }, []);

  const filteredCameras =
    filterStatus === "all"
      ? cameras
      : cameras.filter((camera) => camera.status === filterStatus);

  const handleCameraSelect = (camera: CameraType) => {
    setSelectedCamera(camera);
    if (mapRef.current) {
      mapRef.current.flyTo([camera.latitude, camera.longitude], 12, {
        duration: 1.5,
      });
    }
  };

  const getStatusColor = (status: string): string => {
    return statusColors[status] || "#999999";
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case "online":
        return "";
      case "offline":
        return "";
      case "warning":
        return "";
      default:
        return "";
    }
  };

  // Get obstacles for a specific camera
  const getCameraObstacles = (cameraId: number): ObstacleType[] => {
    const cameraObstacles = obstacles.filter(
      (obstacle) => obstacle.cameraId === cameraId
    );
    console.log(`Camera ${cameraId} obstacles:`, cameraObstacles); // Debug log
    return cameraObstacles;
  };

  // Check if camera has obstacles
  const hasObstacles = (cameraId: number): boolean => {
    return getCameraObstacles(cameraId).length > 0;
  };

  // Format detection time
  const formatDetectionTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }

      // Format manually to avoid locale issues
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  // Get relative time
  const getRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );

      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } catch (error) {
      return "Unknown";
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar defaultActiveItem="map" />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Camera Location Map" />
        <div className="flex p-4 gap-6 flex-grow overflow-hidden">
          <div className="w-3/5 flex flex-col">
            {/* Filter controls */}
            <div className="mb-4 bg-white p-3 rounded-lg shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">
                    Filter by status:
                  </span>
                  <div className="flex gap-1">
                    {["all", "online", "offline", "warning"].map((status) => (
                      <button
                        key={status}
                        className={`px-3 py-1 rounded-md text-sm transition ${
                          filterStatus === status
                            ? `text-white ${
                                status === "online"
                                  ? "bg-green-500"
                                  : status === "offline"
                                  ? "bg-red-500"
                                  : status === "warning"
                                  ? "bg-yellow-500"
                                  : "bg-blue-500"
                              }`
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        onClick={() => setFilterStatus(status)}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Location controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                      className={`px-3 py-1 rounded-md text-sm transition flex items-center gap-2 ${
                        isGettingLocation
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      }`}
                      title="Get current location"
                    >
                      {isGettingLocation ? (
                        <>
                          <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          Getting...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          My Location
                        </>
                      )}
                    </button>
                    {locationError && (
                      <span
                        className="text-xs text-red-600 max-w-32 truncate"
                        title={locationError}
                      >
                        {locationError}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-600">
                    <span className="font-semibold">
                      {filteredCameras.length}
                    </span>{" "}
                    cameras displayed
                  </div>
                </div>
              </div>
            </div>

            {/* Map container with dynamic z-index */}
            <div
              className={`flex-grow relative rounded-lg overflow-hidden shadow-md ${
                isFullscreenOpen
                  ? "map-container-hidden"
                  : "map-container-normal"
              }`}
            >
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50 p-4">
                  <div className="text-red-600 text-center">{error}</div>
                </div>
              ) : (
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  zoomControl={false}
                  className="h-full w-full"
                  ref={(mapInstance) => {
                    if (mapInstance) mapRef.current = mapInstance;
                  }}
                >
                  <ZoomControl position="bottomright" />

                  <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Standard Map">
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="© OpenStreetMap"
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satellite">
                      <TileLayer
                        url="http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                        attribution="© Google"
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Dark Mode">
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution="© CARTO"
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Terrain">
                      <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}"
                        attribution="© Esri"
                      />
                    </LayersControl.BaseLayer>
                  </LayersControl>

                  {filteredCameras.map((camera) => {
                    const cameraObstacles = getCameraObstacles(camera.id);
                    const hasObstacleData = hasObstacles(camera.id);

                    // Debug log for each camera
                    console.log(`Camera ${camera.id} (${camera.name}):`, {
                      hasObstacles: hasObstacleData,
                      obstacleCount: cameraObstacles.length,
                      obstacles: cameraObstacles,
                    });

                    return (
                      <div
                        key={camera.id}
                        className={`circle-camera ${
                          hasObstacleData ? "has-obstacles" : ""
                        }`}
                      >
                        <Marker
                          position={[camera.latitude, camera.longitude]}
                          icon={
                            hasObstacleData
                              ? cameraWithObstacleIcon
                              : cameraIcon
                          }
                          eventHandlers={{
                            click: () => handleCameraSelect(camera),
                          }}
                        >
                          <Popup
                            maxWidth={420}
                            maxHeight={500}
                            className="custom-popup"
                          >
                            <div className="bg-gradient-to-br from-white to-slate-50 flex flex-col h-full">
                              {/* Header Section */}
                              <div className="relative px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="font-semibold text-lg leading-tight truncate">
                                      {camera.name}
                                    </h3>
                                  </div>
                                </div>
                              </div>

                              {/* Content Section - Scrollable */}
                              <div className="flex-1 overflow-y-auto">
                                <div className="px-4 py-3">
                                  {/* Location Info */}
                                  <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-center gap-2 mb-2">
                                      <svg
                                        className="w-4 h-4 text-gray-500 flex-shrink-0"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="font-medium text-gray-700 text-sm">
                                        Location
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-600 ml-6">
                                      <div className="mb-1 leading-relaxed">
                                        {camera.location}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {camera.latitude.toFixed(6)},{" "}
                                        {camera.longitude.toFixed(6)}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Obstacles Section */}
                                  <div className="mb-2">
                                    {hasObstacleData ? (
                                      <div>
                                        <div className="flex items-center gap-2 mb-3 sticky top-0 bg-white z-10 py-1">
                                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
                                          <span className="font-semibold text-red-700 text-sm">
                                            Obstacles Detected
                                          </span>
                                          <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-medium ml-auto">
                                            {cameraObstacles.length}
                                          </span>
                                        </div>

                                        {/* Scrollable obstacles list */}
                                        <div className="max-h-60 overflow-y-auto obstacles-scroll space-y-2 pr-1">
                                          {cameraObstacles.map(
                                            (obstacle, index) => (
                                              <div
                                                key={obstacle.id}
                                                className="bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                                              >
                                                <div className="flex justify-between items-start gap-3">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                      <span className="inline-flex items-center justify-center w-4 h-4 bg-red-100 text-red-700 text-xs font-bold rounded-full flex-shrink-0">
                                                        {index + 1}
                                                      </span>
                                                      <span className="font-medium text-red-800 text-sm truncate">
                                                        {obstacle.obstacleType}
                                                      </span>
                                                    </div>
                                                    <div className="ml-6">
                                                      <div className="text-xs text-red-600 mb-0.5 font-medium">
                                                        {getRelativeTime(
                                                          obstacle.detectionTime
                                                        )}
                                                      </div>
                                                      <div className="text-xs text-gray-500">
                                                        {formatDetectionTime(
                                                          obstacle.detectionTime
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {obstacle.imageUrl && (
                                                    <div className="flex-shrink-0">
                                                      <img
                                                        src={obstacle.imageUrl}
                                                        alt={
                                                          obstacle.obstacleType
                                                        }
                                                        className="w-12 h-12 object-cover rounded border-2 border-white shadow-sm hover:scale-105 transition-transform cursor-pointer"
                                                        onError={(e) => {
                                                          const target =
                                                            e.target as HTMLImageElement;
                                                          target.style.display =
                                                            "none";
                                                        }}
                                                      />
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>

                                        {/* Show scroll hint if many obstacles */}
                                        {cameraObstacles.length > 3 && (
                                          <div className="text-center py-2 border-t border-red-100 mt-2">
                                            <div className="inline-flex items-center gap-1 text-xs text-red-600">
                                              <svg
                                                className="w-3 h-3 animate-bounce"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                              >
                                                <path
                                                  fillRule="evenodd"
                                                  d="M15.707 4.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L10 8.586l4.293-4.293a1 1 0 011.414 0zm0 6a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L10 14.586l4.293-4.293a1 1 0 011.414 0z"
                                                  clipRule="evenodd"
                                                />
                                              </svg>
                                              Scroll to view all obstacles
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                          <span className="text-green-700 font-medium text-sm">
                                            All Clear
                                          </span>
                                        </div>
                                        <p className="text-green-600 text-xs mt-1 ml-4">
                                          No obstacles detected
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      </div>
                    );
                  })}

                  {/* User location marker */}
                  {userLocation && (
                    <Marker position={userLocation} icon={userLocationIcon}>
                      <Tooltip
                        direction="top"
                        offset={[0, -30]}
                        opacity={1}
                        permanent={false}
                        className="rounded-lg shadow-md bg-white border border-gray-300"
                      >
                        <div className="px-2 py-1 text-sm font-semibold text-blue-700 flex items-center gap-1">
                          📍 Your location
                        </div>
                      </Tooltip>
                    </Marker>
                  )}
                </MapContainer>
              )}
            </div>
          </div>

          {selectedCamera && (
            <div className="w-2/5">

              <CameraDetail camera={selectedCamera} />

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
