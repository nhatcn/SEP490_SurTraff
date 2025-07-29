import { useState, useEffect } from "react";
import { Header, MobileDropdownMenu } from "../../components/Layout/Menu";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Marker,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import Footer from "../../components/Layout/Footer";

interface TrafficDensity {
  id: number;
  camera_id: number;
  location: string;
  vehicleCount: number;
  createdAt: string;
  latitude: number;
  longitude: number;
}

interface Accident {
  id: number;
  cameraId: number;
  latitude: number;
  longitude: number;
  vehicleId: number;
  userId: number;
  userEmail?: string | null;
  userFullName: string;
  licensePlate: string;
  name: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  location?: string | null;
  status: string;
  accidentTime: string;
  createdAt: string;
}

const getColorByDensity = (count: number) => {
  if (count >= 25) return "#dc2626";
  if (count >= 20) return "#ea580c";
  if (count >= 15) return "#f59e0b";
  if (count >= 10) return "#84cc16";
  return "#16a34a";
};

const getTrafficLevel = (count: number) => {
  if (count >= 25) return { level: "Very Heavy", color: "text-red-600" };
  if (count >= 20) return { level: "Heavy", color: "text-orange-600" };
  if (count >= 15) return { level: "Moderate", color: "text-yellow-600" };
  if (count >= 10) return { level: "Light", color: "text-lime-600" };
  return { level: "Very Light", color: "text-green-600" };
};

const accidentIcon = L.divIcon({
  className: "accident-icon",
  html: `
    <div style="position: relative; width: 36px; height: 36px;">
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#d32f2f"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        style="filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.9));"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12" y2="17"/>
      </svg>
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        width: 44px;
        height: 44px;
        margin-left: -22px;
        margin-top: -22px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 15px 5px rgba(255, 255, 255, 0.9);
        animation: pulse-white 2.5s infinite;
        pointer-events: none;
      "></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

export default function UserTrafficMap() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [trafficData, setTrafficData] = useState<TrafficDensity[]>([]);
  const [accidentData, setAccidentData] = useState<Accident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [trafficRes, accidentRes] = await Promise.all([
          fetch("http://localhost:8081/api/trafficdensity"),
          fetch("http://localhost:8081/api/accident"),
        ]);

        if (!trafficRes.ok) throw new Error(`Traffic API error: ${trafficRes.status}`);
        if (!accidentRes.ok) throw new Error(`Accident API error: ${accidentRes.status}`);

        const trafficJson: TrafficDensity[] = await trafficRes.json();
        const accidentJson: Accident[] = await accidentRes.json();

        setTrafficData(trafficJson);
        setAccidentData(accidentJson);
        setLastUpdate(new Date());
      } catch (err: any) {
        console.error(err);
        setError("Unable to fetch data from API. Please check server or network.");
        setTrafficData([]);
        setAccidentData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const defaultCenter: [number, number] = [10.7769, 106.6957];
  const totalVehicles = trafficData.reduce((sum, item) => sum + item.vehicleCount, 0);
  const highTrafficPoints = trafficData.filter((item) => item.vehicleCount >= 20).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
      <MobileDropdownMenu showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <p className="text-gray-700 text-2xl md:text-3xl font-extrabold uppercase tracking-wide">
            Real-time Traffic Density Monitoring
          </p>
          <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Last updated: {lastUpdate.toLocaleTimeString("en-US")}</span>
            </div>
          </div>
        </div>

        {/* Thống kê */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Points */}
          <StatCard title="Total Monitoring Points" value={trafficData.length} color="blue" />
          {/* Total Vehicles */}
          <StatCard title="Total Vehicles" value={totalVehicles} color="green" />
          {/* High Traffic Points */}
          <StatCard title="High Traffic Points" value={highTrafficPoints} color="orange" />
        </div>

        {/* Legend */}
        <Legend />

        {/* Loading / Error / Map */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading traffic data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-200 text-red-700 p-6 rounded-xl text-center shadow-lg">
            <strong className="block mb-2">⚠️ Warning</strong>
            <p>{error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="h-[700px] relative">
              <MapContainer
                center={defaultCenter}
                zoom={13}
                zoomControl={false}
                className="h-full w-full"
                style={{ borderRadius: "0.75rem" }}
              >
                <ZoomControl position="bottomright" />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap contributors"
                />

                {trafficData.map((entry) => {
                  const trafficLevel = getTrafficLevel(entry.vehicleCount);
                  return (
                    <CircleMarker
                      key={`traffic-${entry.id}`}
                      center={[entry.latitude, entry.longitude]}
                      radius={Math.max(8, Math.min(20, entry.vehicleCount * 0.8))}
                      pathOptions={{
                        color: "#ffffff",
                        weight: 3,
                        fillColor: getColorByDensity(entry.vehicleCount),
                        fillOpacity: 0.8,
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -10]} opacity={1} className="custom-tooltip">
                        <div className="p-3 min-w-[250px]">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-gray-800 text-sm">{entry.location}</h4>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trafficLevel.color} bg-gray-100`}>
                              {trafficLevel.level}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex items-center justify-between">
                              <span>Vehicle Count:</span>
                              <span className="font-semibold text-gray-800">{entry.vehicleCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Camera ID:</span>
                              <span className="font-mono text-gray-800">#{entry.camera_id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Recorded At:</span>
                              <span>{new Date(entry.createdAt).toLocaleString("en-US")}</span>
                            </div>
                          </div>
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}

                {accidentData
                  .filter((acc) => acc.status?.toLowerCase() === "approved")
                  .map((acc) => (
                    <Marker key={`accident-${acc.id}`} position={[acc.latitude, acc.longitude]} icon={accidentIcon}>
                      <Tooltip direction="top" offset={[0, -30]} opacity={1} className="custom-tooltip">
                        <div className="p-3 min-w-[280px]">
                          <div className="font-bold text-red-700 mb-2 text-center text-lg">Accident</div>
                          <img
                            src={acc.imageUrl}
                            alt={`Accident at camera #${acc.cameraId}`}
                            className="w-full rounded-md mb-2"
                            loading="lazy"
                          />
                          <p><strong>Description:</strong> {acc.description}</p>
                          <p><strong>Vehicle:</strong> {acc.name} ({acc.licensePlate})</p>
                          <p><strong>Reported by:</strong> {acc.userFullName || "Unknown"}</p>
                          <p><strong>Time:</strong> {new Date(acc.accidentTime).toLocaleString("en-US")}</p>
                        </div>
                      </Tooltip>
                    </Marker>
                  ))}
              </MapContainer>
            </div>
          </div>
        )}
      </main>

      <Footer />

      <style>{`
        .custom-tooltip {
          border-radius: 8px !important;
          border: none !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
          background: white !important;
          color: #333 !important;
        }
        .leaflet-tooltip-top:before {
          border-top-color: white !important;
        }
        @keyframes pulse-white {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}

// Helper Components
function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600 mr-4`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="5" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Legend() {
  const legend = [
    { range: "25+ vehicles", color: "#dc2626", level: "Very Heavy" },
    { range: "20-24 vehicles", color: "#ea580c", level: "Heavy" },
    { range: "15-19 vehicles", color: "#f59e0b", level: "Moderate" },
    { range: "10-14 vehicles", color: "#84cc16", level: "Light" },
    { range: "< 10 vehicles", color: "#16a34a", level: "Very Light" },
  ];
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Traffic Density Legend</h3>
      <div className="flex flex-wrap gap-4">
        {legend.map((item, idx) => (
          <div key={idx} className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: item.color }}
            ></div>
            <span className="text-sm text-gray-700 font-medium">{item.level}</span>
            <span className="text-xs text-gray-500">({item.range})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
