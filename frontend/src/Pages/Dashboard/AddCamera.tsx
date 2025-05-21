import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Layout/Header";
import Sidebar from "../../components/Layout/Sidebar";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const markerIconUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png";
const markerShadowUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png";

interface Zone {
  id: string;
  type: "lane" | "line" | "light";
  coordinates: number[][];
  name: string;
  color: string;
}

const defaultIcon = new L.Icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function LocationPicker({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number, address: string) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const map = useMap();
  
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

function ZoneCanvas({ 
  activeZoneType,
  zones,
  setZones,
  thumbnailUrl 
}: { 
  activeZoneType: string | null,
  zones: Zone[],
  setZones: React.Dispatch<React.SetStateAction<Zone[]>>,
  thumbnailUrl: string 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [currentPoints, setCurrentPoints] = useState<number[][]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const img = new Image();
    img.src = thumbnailUrl;
    img.onload = () => {
      imgRef.current = img;
      redrawCanvas();
    };
  }, [thumbnailUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    setCanvasSize({
      width: containerWidth,
      height: containerWidth * 0.66
    });
    
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      setCanvasSize({
        width: newWidth,
        height: newWidth * 0.66
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = canvasSize.width;
      canvasRef.current.height = canvasSize.height;
      redrawCanvas();
    }
  }, [canvasSize]);

  useEffect(() => {
    redrawCanvas();
  }, [zones, currentPoints]);

  const redrawCanvas = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || !canvas.width || !canvas.height) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    }
    
    // Draw existing zones
    zones.forEach(zone => {
      ctx.beginPath();
      
      if (zone.coordinates.length > 0) {
        ctx.moveTo(zone.coordinates[0][0], zone.coordinates[0][1]);
        
        for (let i = 1; i < zone.coordinates.length; i++) {
          ctx.lineTo(zone.coordinates[i][0], zone.coordinates[i][1]);
        }
        
        if (zone.type !== 'line') {
          ctx.closePath();
        }
      }
      
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      
      if (zone.type !== 'line') {
        ctx.fillStyle = `${zone.color}33`;
        ctx.fill();
      }
    });
    
    // Draw current points and connecting lines
    if (currentPoints.length > 0) {
      // Draw points
      currentPoints.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point[0], point[1], 4, 0, Math.PI * 2);
        ctx.fillStyle = getZoneColor(activeZoneType);
        ctx.fill();
        
        // Add point number
        ctx.fillStyle = "#000";
        ctx.font = "12px Arial";
        ctx.fillText(`${index + 1}`, point[0] + 6, point[1] - 6);
      });
      
      // Connect points with lines
      ctx.beginPath();
      ctx.moveTo(currentPoints[0][0], currentPoints[0][1]);
      
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i][0], currentPoints[i][1]);
      }
      
      // For polygons (lane, light), show a preview of the closed shape
      if (activeZoneType !== 'line' && currentPoints.length > 2) {
        ctx.lineTo(currentPoints[0][0], currentPoints[0][1]);
      }
      
      ctx.strokeStyle = getZoneColor(activeZoneType);
      ctx.lineWidth = 2;
      ctx.stroke();
      
      if (activeZoneType !== 'line' && currentPoints.length > 2) {
        ctx.fillStyle = `${getZoneColor(activeZoneType)}33`;
        ctx.fill();
      }
    }
  };

  const getZoneColor = (zoneType: string | null): string => {
    switch(zoneType) {
      case 'lane': return "#3B82F6"; // blue
      case 'line': return "#EF4444"; // red
      case 'light': return "#F59E0B"; // amber
      default: return "#888";
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeZoneType) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Handle different zone types
    if (activeZoneType === 'line') {
      // For line type, just add points until we have 2
      if (currentPoints.length < 2) {
        setCurrentPoints([...currentPoints, [x, y]]);
      } else {
        // Replace the second point on subsequent clicks
        setCurrentPoints([currentPoints[0], [x, y]]);
      }
    } else {
      // For polygon types, add the point to the array
      setCurrentPoints([...currentPoints, [x, y]]);
    }
  };

  const handleFinishZone = () => {
    if (!activeZoneType) return;
    
    // Validate the zone
    let isValid = false;
    
    if (activeZoneType === 'line') {
      isValid = currentPoints.length === 2;
    } else {
      isValid = currentPoints.length >= 4;
    }
    
    if (isValid) {
      const newZone: Zone = {
        id: Date.now().toString(),
        type: activeZoneType as "lane" | "line" | "light",
        coordinates: currentPoints,
        name: `${activeZoneType.charAt(0).toUpperCase() + activeZoneType.slice(1)} Zone ${zones.length + 1}`,
        color: getZoneColor(activeZoneType)
      };
      
      setZones(prev => [...prev, newZone]);
      setCurrentPoints([]);
    } else if (activeZoneType !== 'line' && currentPoints.length < 4) {
      alert(`${activeZoneType.charAt(0).toUpperCase() + activeZoneType.slice(1)} zones must have at least 4 points.`);
    }
  };

  const handleClearPoints = () => {
    setCurrentPoints([]);
  };

  const handleUndoPoint = () => {
    if (currentPoints.length > 0) {
      setCurrentPoints(currentPoints.slice(0, -1));
    }
  };

  return (
    <div ref={containerRef} className="relative border rounded">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="cursor-crosshair"
        onClick={handleCanvasClick}
      />
      {!activeZoneType && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white">
          Select a zone type to start drawing
        </div>
      )}
      {activeZoneType && (
        <div className="absolute bottom-2 left-2 bg-white bg-opacity-75 px-2 py-1 text-sm rounded">
          Click to add points. {activeZoneType !== 'line' ? 'Minimum 4 points required for polygon zones.' 
            : 'Exactly 2 points required for line zones.'}
        </div>
      )}
      
      {activeZoneType && currentPoints.length > 0 && (
        <div className="absolute top-2 right-2 bg-white bg-opacity-90 p-2 rounded flex gap-2">
          <button 
            onClick={handleUndoPoint}
            className="px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
          >
            Undo Point
          </button>
          <button 
            onClick={handleClearPoints}
            className="px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
          >
            Clear All
          </button>
          <button 
            onClick={handleFinishZone}
            className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            disabled={(activeZoneType === 'line' && currentPoints.length !== 2) || 
              (activeZoneType !== 'line' && currentPoints.length < 4)}
          >
            Finish Zone
          </button>
        </div>
      )}
    </div>
  );
}

export default function AddCamera() {
  const navigate = useNavigate();
  
  const [name, setName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [location, setLocation] = useState({ lat: 0, lng: 0, selected: false });
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeZoneType, setActiveZoneType] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("https://th.bing.com/th/id/OIP.qhZxpqlB1IrnkwmONFBVewHaFC?cb=iwc2&rs=1&pid=ImgDetMain");

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setLocation({
      lat,
      lng,
      selected: true
    });
    setLocationAddress(address);
  };

  const handleDeleteZone = (id: string) => {
    setZones(zones.filter(zone => zone.id !== id));
  };

  const handleSubmit = async () => {
    if (!name) {
      alert("Camera name is required");
      return;
    }
    
    if (!location.selected) {
      alert("Please select a location on the map");
      return;
    }
    
    if (!locationAddress) {
      alert("Location address is required");
      return;
    }
    
    const cameraData = {
      name,
      location: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
      location_address: locationAddress,
      stream_url: streamUrl,
      thumbnail: thumbnailUrl,
    };
    
    try {
      const response = await fetch("http://localhost:8000/api/cameras", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...cameraData,
          zones: zones.map(z => ({
            type: z.type,
            coordinates: z.coordinates,
            name: z.name
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to add camera");
      }
      
      alert("Camera added successfully!");
      navigate("/cameras");
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-auto">
        <Header title="Add New Camera" />
        
        <div className="p-6 max-w-6xl mx-auto w-full">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-6">Camera Details</h2>
            
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
                <label className="block mb-2 font-medium">Stream URL</label>
                <input
                  type="text"
                  value={streamUrl}
                  onChange={e => setStreamUrl(e.target.value)}
                  className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                  placeholder="rtsp:// or http:// stream URL"
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block mb-2 font-medium">Location *</label>
              <div className="h-80 border rounded">
                <MapContainer 
                  center={[21.0278, 105.8342]} 
                  zoom={13} 
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationPicker onLocationSelect={handleLocationSelect} />
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
            
            <div>
              <h3 className="text-xl font-semibold mb-4">Camera Thumbnail & Zones</h3>
              
              <div className="mb-4">
                <label className="block mb-2 font-medium">Select Zone Type to Draw</label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setActiveZoneType("lane")}
                    className={`px-4 py-2 rounded ${activeZoneType === "lane" 
                      ? "bg-blue-600 text-white" 
                      : "bg-blue-100 text-blue-800 hover:bg-blue-200"}`}
                  >
                    Lane Zone
                  </button>
                  <button
                    onClick={() => setActiveZoneType("line")}
                    className={`px-4 py-2 rounded ${activeZoneType === "line" 
                      ? "bg-red-600 text-white" 
                      : "bg-red-100 text-red-800 hover:bg-red-200"}`}
                  >
                    Line Zone
                  </button>
                  <button
                    onClick={() => setActiveZoneType("light")}
                    className={`px-4 py-2 rounded ${activeZoneType === "light" 
                      ? "bg-amber-600 text-white" 
                      : "bg-amber-100 text-amber-800 hover:bg-amber-200"}`}
                  >
                    Light Zone
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
              />
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Defined Zones ({zones.length})</h4>
                {zones.length === 0 ? (
                  <div className="text-gray-500 italic">No zones defined yet</div>
                ) : (
                  <div className="space-y-2">
                    {zones.map(zone => (
                      <div key={zone.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 mr-2 rounded-full" 
                            style={{ backgroundColor: zone.color }}
                          ></div>
                          <span>{zone.name} ({zone.coordinates.length} points)</span>
                        </div>
                        <button
                          onClick={() => handleDeleteZone(zone.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                Add Camera
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}