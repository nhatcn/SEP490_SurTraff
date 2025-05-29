import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../../components/Layout/Header";
import Sidebar from "../../../components/Layout/Sidebar";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import ZoneCanvas from "../../../components/Camera/ZoneCanvas";
import LaneDirectionConfig from "../../../components/Camera/LaneDirectionConfig";
import LightZoneMappingConfig from "../../../components/Camera/LightZoneMappingConfig";

const markerIconUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png";
const markerShadowUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png";

export interface Zone {
  id: string;
  type: "lane" | "line" | "light";
  coordinates: number[][];
  name: string;
  color: string;
}

export interface LaneDirection {
  id: string;
  fromZoneId: string;
  toZoneId: string;
  name: string;
  fromZoneName: string;
  toZoneName: string;
}

export interface LightZoneMapping {
  id: string;
  lightZoneId: string;
  laneZoneId: string;
  lightZoneName: string;
  laneZoneName: string;
}

interface CameraData {
  id: number;
  name: string;
  streamUrl: string;
  latitude: number;
  longitude: number;
  location: string;
  zones: any[];
  laneDirections: any[];
  lightZoneMappings: any[];
}

const defaultIcon = new L.Icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function LocationPicker({ 
  onLocationSelect, 
  initialPosition 
}: { 
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialPosition: [number, number] | null;
}) {
  const [position, setPosition] = useState<[number, number] | null>(initialPosition);
  const [searchQuery, setSearchQuery] = useState("");
  const map = useMap();

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
      map.setView(initialPosition, 15);
    }
  }, [initialPosition, map]);

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        reverseGeocode(e.latlng.lat, e.latlng.lng).then(address => {
          onLocationSelect(e.latlng.lat, e.latlng.lng, address);
        });
      },
    });
    return null;
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      return data.display_name || "Address not found";
    } catch (error) {
      console.error("Error in reverse geocoding:", error);
      return "Failed to get address";
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lon);

        map.setView([latNum, lngNum], 15);
        setPosition([latNum, lngNum]);
        onLocationSelect(latNum, lngNum, data[0].display_name || "");
      } else {
        alert("Location not found. Please try another search term.");
      }
    } catch (error) {
      console.error("Error searching location:", error);
      alert("Error searching for location");
    }
  };

  return (
    <>
      <div className="absolute top-2 left-2 z-1000 bg-white p-2 rounded shadow-md w-64">
        <form onSubmit={handleSearch} className="flex">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location..."
            className="flex-grow p-2 text-sm border rounded-l"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-3 rounded-r hover:bg-blue-700"
          >
            Search
          </button>
        </form>
      </div>

      <MapEvents />
      {position && (
        <Marker position={position} icon={defaultIcon}>
          <Popup>Camera location</Popup>
        </Marker>
      )}
    </>
  );
}

export default function EditCamera() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [location, setLocation] = useState({ lat: 0, lng: 0, selected: false });
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeZoneType, setActiveZoneType] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("https://cdn.discordapp.com/attachments/1242410259205591071/1377269674659811389/image.png?ex=683859d6&is=68370856&hm=ab8a11b4c25e432ffb136cbf4c0b0b31fb25cbb3e40d4d3c3e2829b888505523&");
  const [laneDirections, setLaneDirections] = useState<LaneDirection[]>([]);
  const [lightZoneMappings, setLightZoneMappings] = useState<LightZoneMapping[]>([]);
  const [nextZoneId, setNextZoneId] = useState<number>(1);
  const [originalCameraData, setOriginalCameraData] = useState<CameraData | null>(null);

  // Helper function to get zone color based on type
  const getZoneColor = (zoneType: string): string => {
    switch(zoneType.toLowerCase()) {
      case 'lane': return "#3B82F6";
      case 'line': return "#EF4444"; 
      case 'light': return "#F59E0B";
      default: return "#888";
    }
  };

  // Load camera data on component mount
  useEffect(() => {
    const fetchCameraData = async () => {
      if (!id) {
        navigate("/cameras");
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8081/api/cameras/${id}`);
        
        if (!response.ok) {
          throw new Error("Camera not found");
        }

        const cameraData: CameraData = await response.json();
        setOriginalCameraData(cameraData);

        // Set basic camera info
        setName(cameraData.name);
        setStreamUrl(cameraData.streamUrl);
        setLocationAddress(cameraData.location);
        setLocation({
          lat: cameraData.latitude,
          lng: cameraData.longitude,
          selected: true
        });

        // Transform and set zones
        const transformedZones: Zone[] = cameraData.zones.map(zone => ({
          id: zone.id.toString(),
          type: zone.zoneType as "lane" | "line" | "light",
          coordinates: JSON.parse(zone.coordinates),
          name: zone.name,
          color: getZoneColor(zone.zoneType)
        }));
        setZones(transformedZones);

        // Transform and set lane directions
        const transformedLaneDirections: LaneDirection[] = cameraData.laneDirections.map(dir => {
          const fromZone = transformedZones.find(z => z.id === dir.fromLaneZoneId.toString());
          const toZone = transformedZones.find(z => z.id === dir.toLaneZoneId.toString());
          
          return {
            id: `${dir.fromLaneZoneId}_${dir.toLaneZoneId}`,
            fromZoneId: dir.fromLaneZoneId.toString(),
            toZoneId: dir.toLaneZoneId.toString(),
            name: `${fromZone?.name || 'Unknown'} → ${toZone?.name || 'Unknown'}`,
            fromZoneName: fromZone?.name || 'Unknown',
            toZoneName: toZone?.name || 'Unknown'
          };
        });
        setLaneDirections(transformedLaneDirections);

        // Transform and set light zone mappings
        const transformedLightMappings: LightZoneMapping[] = cameraData.lightZoneMappings.map(mapping => {
          const lightZone = transformedZones.find(z => z.id === mapping.lightZoneId.toString());
          const laneZone = transformedZones.find(z => z.id === mapping.laneZoneId.toString());
          
          return {
            id: `${mapping.lightZoneId}_${mapping.laneZoneId}`,
            lightZoneId: mapping.lightZoneId.toString(),
            laneZoneId: mapping.laneZoneId.toString(),
            lightZoneName: lightZone?.name || 'Unknown',
            laneZoneName: laneZone?.name || 'Unknown'
          };
        });
        setLightZoneMappings(transformedLightMappings);

        // Set next zone ID for new zones
        const maxZoneId = Math.max(...transformedZones.map(z => parseInt(z.id)), 0);
        setNextZoneId(maxZoneId + 1);

      } catch (error) {
        console.error("Error fetching camera data:", error);
        alert("Failed to load camera data");
        navigate("/cameras");
      } finally {
        setLoading(false);
      }
    };

    fetchCameraData();
  }, [id, navigate]);

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setLocation({
      lat,
      lng,
      selected: true
    });
    setLocationAddress(address);
  };

  const handleDeleteZone = (zoneId: string) => {
    setZones(zones.filter(zone => zone.id !== zoneId));

    // Remove related lane directions
    setLaneDirections(prev => prev.filter(dir =>
      dir.fromZoneId !== zoneId && dir.toZoneId !== zoneId
    ));

    // Remove related light zone mappings
    setLightZoneMappings(prev => prev.filter(mapping =>
      mapping.lightZoneId !== zoneId && mapping.laneZoneId !== zoneId
    ));
  };

  const handleSubmit = async () => {
    if (!name || !streamUrl || !location.selected || !locationAddress) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const updateData = {
        cameraName: name,
        cameraUrl: streamUrl,
        latitude: location.lat,
        longitude: location.lng,
        location: locationAddress,
        zones: zones.map(z => ({
          id: parseInt(z.id),
          name: z.name,
          zoneType: z.type.toLowerCase(),
          coordinates: JSON.stringify(z.coordinates)
        })),
        zoneLightLaneLinks: lightZoneMappings.map(mapping => ({
          lightZoneId: parseInt(mapping.lightZoneId),
          laneZoneId: parseInt(mapping.laneZoneId)
        })),
        laneMovements: laneDirections.map(dir => ({
          fromLaneZoneId: parseInt(dir.fromZoneId),
          toLaneZoneId: parseInt(dir.toZoneId)
        }))
      };

      console.log('Sending camera update data:', updateData);

      const response = await fetch(`http://localhost:8081/api/cameras/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update camera: ${errorData}`);
      }

      alert("Camera updated successfully!");
      navigate("/cameras");
    } catch (error: unknown) {
      console.error("Update error:", error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-col flex-grow overflow-auto">
          <Header title="Edit Camera" />
          <div className="p-6 max-w-6xl mx-auto w-full">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">Loading camera data...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-auto">
        <Header title={`Edit Camera: ${name}`} />

        <div className="p-6 max-w-7xl mx-auto w-full">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Camera Details</h2>
              <div className="text-sm text-gray-500">
                Camera ID: {id}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block mb-2 font-medium">Camera Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                  placeholder="Enter camera name"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Stream URL *</label>
                <input
                  type="text"
                  value={streamUrl}
                  onChange={e => setStreamUrl(e.target.value)}
                  className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                  placeholder="rtsp:// or http:// stream URL"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block mb-2 font-medium">Location *</label>
              <div className="h-80 border rounded">
                <MapContainer
                  center={location.selected ? [location.lat, location.lng] : [21.0278, 105.8342]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  key={`${location.lat}-${location.lng}`} // Force re-render when location changes
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationPicker 
                    onLocationSelect={handleLocationSelect}
                    initialPosition={location.selected ? [location.lat, location.lng] : null}
                  />
                </MapContainer>
              </div>
              {location.selected && (
                <div className="mt-2 text-sm text-gray-600">
                  Selected coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block mb-2 font-medium">Location Address *</label>
              <input
                type="text"
                value={locationAddress}
                onChange={e => setLocationAddress(e.target.value)}
                className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                placeholder="Street, Ward, District, City, etc."
                required
              />
              <div className="mt-1 text-sm text-gray-500">
                The address will be auto-populated when selecting a location on the map, but you can edit it if needed.
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4">Camera Thumbnail & Zones</h3>
              
              <div className="mb-4 p-4 bg-blue-50 rounded">
                <h4 className="font-medium text-blue-900 mb-2">Zone Management</h4>
                <p className="text-sm text-blue-800 mb-3">
                  You can edit existing zones or add new ones. Existing zones: {zones.filter(z => parseInt(z.id) <= (originalCameraData?.zones.length || 0)).length}, 
                  New zones: {zones.filter(z => parseInt(z.id) > (originalCameraData?.zones.length || 0)).length}
                </p>
                
                <div className="flex space-x-4">
                  <button
                    onClick={() => setActiveZoneType("lane")}
                    className={`px-4 py-2 rounded ${activeZoneType === "lane"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-100 text-blue-800 hover:bg-blue-200"}`}
                  >
                    Add Lane Zone
                  </button>
                  <button
                    onClick={() => setActiveZoneType("line")}
                    className={`px-4 py-2 rounded ${activeZoneType === "line"
                      ? "bg-red-600 text-white"
                      : "bg-red-100 text-red-800 hover:bg-red-200"}`}
                  >
                    Add Line Zone
                  </button>
                  <button
                    onClick={() => setActiveZoneType("light")}
                    className={`px-4 py-2 rounded ${activeZoneType === "light"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-100 text-amber-800 hover:bg-amber-200"}`}
                  >
                    Add Light Zone
                  </button>
                  {activeZoneType && (
                    <button
                      onClick={() => setActiveZoneType(null)}
                      className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <ZoneCanvas
                activeZoneType={activeZoneType}
                zones={zones}
                setZones={setZones}
                thumbnailUrl={thumbnailUrl}
                nextZoneId={nextZoneId}
                setNextZoneId={setNextZoneId}
                onDeleteZone={handleDeleteZone}
              />
            </div>

            <div className="mb-6">
              <LaneDirectionConfig
                zones={zones}
                laneDirections={laneDirections}
                setLaneDirections={setLaneDirections}
              />
            </div>

            <div className="mb-6">
              <LightZoneMappingConfig
                zones={zones}
                lightZoneMappings={lightZoneMappings}
                setLightZoneMappings={setLightZoneMappings}
              />
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <button
                onClick={() => navigate("/cameras")}
                className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Update Camera
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}