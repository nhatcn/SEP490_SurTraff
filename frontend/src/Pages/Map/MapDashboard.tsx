import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  ZoomControl,
  CircleMarker
} from "react-leaflet";
import L, { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import Sidebar from "../../components/Layout/Sidebar";
import Header from "../../components/Layout/Header";
import CameraDetail from "../../components/Camera/CameraDetail";

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

// Camera icon
const cameraIcon: Icon = new L.Icon({

  iconUrl: "https://tse3.mm.bing.net/th/id/OIP.rDwv7jSrMyrexUsSSdYd8wHaHa?rs=1&pid=ImgDetMain",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Status color
const statusColors: Record<string, string> = {
  online: "#4CAF50",
  offline: "#F44336",
  warning: "#FF9800"
};

export default function MapDashboard() {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<CameraType | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.75, 106.67]);
  const [mapZoom, setMapZoom] = useState<number>(6);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/cameras")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch camera data");
        return res.json();
      })
      .then((data: CameraType[]) => {
        setCameras(data);
        setLoading(false);

        if (data.length > 0) {
          setSelectedCamera(data[0]);
          const validCoords = data.filter(c => c.latitude && c.longitude);
          if (validCoords.length > 0) {
            const latSum = validCoords.reduce((sum, cam) => sum + cam.latitude, 0);
            const lngSum = validCoords.reduce((sum, cam) => sum + cam.longitude, 0);
            setMapCenter([latSum / validCoords.length, lngSum / validCoords.length]);
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

  const filteredCameras = filterStatus === "all"
    ? cameras
    : cameras.filter(camera => camera.status === filterStatus);

  const handleCameraSelect = (camera: CameraType) => {
    setSelectedCamera(camera);
    if (mapRef.current) {
      mapRef.current.flyTo([camera.latitude, camera.longitude], 12, { duration: 1.5 });
    }
  };

  const getStatusColor = (status: string): string => {
    return statusColors[status] || "#999999";
  };

  return (
    <div className="flex h-screen">
      <Sidebar defaultActiveItem="map"/>
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Camera Location Map" />
        <div className="flex p-4 gap-6 flex-grow overflow-hidden">
          <div className="w-3/5 flex flex-col">
            {/* Filter controls */}
            <div className="mb-4 bg-white p-3 rounded-lg shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">Filter by status:</span>
                  <div className="flex gap-1">
                    {["all", "online", "offline", "warning"].map(status => (
                      <button
                        key={status}
                        className={`px-3 py-1 rounded-md text-sm transition ${filterStatus === status
                          ? `text-white ${status === "online"
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
                <div className="text-gray-600">
                  <span className="font-semibold">{filteredCameras.length}</span> cameras displayed
                </div>
              </div>
            </div>

            {/* Map container */}
            <div className="flex-grow relative rounded-lg overflow-hidden shadow-md">
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

                  {filteredCameras.map((camera) => (
                    <div key={camera.id} className="circle-camera">
                      <Marker

                        position={[camera.latitude, camera.longitude]}
                        icon={cameraIcon}
                        eventHandlers={{ click: () => handleCameraSelect(camera) }}
                      >

                        <Popup>
                          <div className="p-2">
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getStatusColor(camera.status) }}
                              ></div>
                              <h4 className="font-medium text-gray-800">{camera.name}</h4>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{camera.location}</p>
                            <button
                              className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-2 rounded transition"
                              onClick={() => handleCameraSelect(camera)}
                            >
                              View Details
                            </button>
                          </div>
                        </Popup>
                      </Marker>


                    </div>
                  ))}
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
