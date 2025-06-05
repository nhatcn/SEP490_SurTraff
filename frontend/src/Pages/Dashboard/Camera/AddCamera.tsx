import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  type: "lane" | "line" | "light" | "speed";
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

const defaultIcon = new L.Icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom marker for current location
const currentLocationIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="blue" width="24" height="24">
      <circle cx="12" cy="12" r="8" fill="#4285f4" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

function LocationPicker({ 
  onLocationSelect, 
  currentLocation 
}: { 
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  currentLocation: [number, number] | null;
}) {
  const [position, setPosition] = useState<[number, number] | null>(null);

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

  return (
    <>
      <MapEvents />
      {position && (
        <Marker position={position} icon={defaultIcon}>
          <Popup>Camera location</Popup>
        </Marker>
      )}
      {currentLocation && (
        <Marker position={currentLocation} icon={currentLocationIcon}>
          <Popup>Your current location</Popup>
        </Marker>
      )}
    </>
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
  const [thumbnailUrl, setThumbnailUrl] = useState("https://cdn.discordapp.com/attachments/1242410259205591071/1377269674659811389/image.png?ex=683a5416&is=68390296&hm=490eca1145356df872482526625906149950bef8b99763406476284304405471&");
  const [laneDirections, setLaneDirections] = useState<LaneDirection[]>([]);
  const [lightZoneMappings, setLightZoneMappings] = useState<LightZoneMapping[]>([]);
  const [nextZoneId, setNextZoneId] = useState<number>(1);
  const [isLoadingZoneId, setIsLoadingZoneId] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);

  // Get current location on component mount
  useEffect(() => {
    const getCurrentLocation = () => {
      setIsGettingLocation(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentLocation([latitude, longitude]);
            if (mapRef) {
              mapRef.setView([latitude, longitude], 15);
            }
            setIsGettingLocation(false);
          },
          (error) => {
            console.warn("Error getting location:", error);
            setIsGettingLocation(false);
            // Fallback to Hanoi coordinates
          },
          { 
            enableHighAccuracy: true, 
            timeout: 5000, 
            maximumAge: 0 
          }
        );
      } else {
        setIsGettingLocation(false);
      }
    };

    if (mapRef) {
      getCurrentLocation();
    }
  }, [mapRef]);

  // Search suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 3) {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=vn`
        );
        const data = await response.json();
        setSearchSuggestions(data);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);
  useEffect(() => {
    const fetchLatestZoneId = async () => {
      try {
        setIsLoadingZoneId(true);
        const response = await fetch("http://localhost:8081/api/zones/last-zone-id");

        if (response.ok) {
          const data = await response.json();
          // Set next zone ID to be latest ID + 1, or 1 if no zones exist (null case = 0)
          setNextZoneId((data.lastZoneId || 0) + 1);
        } else {
          console.warn("Failed to fetch latest zone ID, using default");
          setNextZoneId(1);
        }
      } catch (error) {
        console.error("Error fetching latest zone ID:", error);
        // Use default value if API fails
        setNextZoneId(1);
      } finally {
        setIsLoadingZoneId(false);
      }
    };

    fetchLatestZoneId();
  }, []);

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setLocation({
      lat,
      lng,
      selected: true
    });
    setLocationAddress(address);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef) return;

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=vn`);
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lon);

        mapRef.setView([latNum, lngNum], 15);
        handleLocationSelect(latNum, lngNum, data[0].display_name || "");
      } else {
        alert("Location not found. Please try another search term.");
      }
    } catch (error) {
      console.error("Error searching location:", error);
      alert("Error searching for location");
    }
    
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: any) => {
    const latNum = parseFloat(suggestion.lat);
    const lngNum = parseFloat(suggestion.lon);
    
    if (mapRef) {
      mapRef.setView([latNum, lngNum], 15);
      handleLocationSelect(latNum, lngNum, suggestion.display_name || "");
    }
    
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
  };

  const getCurrentLocationManually = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation([latitude, longitude]);
          if (mapRef) {
            mapRef.setView([latitude, longitude], 15);
            // Also reverse geocode to get address
            reverseGeocode(latitude, longitude).then(address => {
              handleLocationSelect(latitude, longitude, address);
            });
          }
          setIsGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Unable to get your current location. Please check your browser permissions.");
          setIsGettingLocation(false);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 0 
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
      setIsGettingLocation(false);
    }
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

  const handleDeleteZone = (id: string) => {
    setZones(zones.filter(zone => zone.id !== id));

    // Remove related lane directions
    setLaneDirections(prev => prev.filter(dir =>
      dir.fromZoneId !== id && dir.toZoneId !== id
    ));

    // Remove related light zone mappings
    setLightZoneMappings(prev => prev.filter(mapping =>
      mapping.lightZoneId !== id && mapping.laneZoneId !== id
    ));
  };

  const handleSubmit = async () => {
    if (!name || !streamUrl || !location.selected || !locationAddress || zones.length === 0) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const setupData = {
        cameraName: name,
        cameraUrl: streamUrl,
        latitude: location.lat,
        longitude: location.lng,
        location: locationAddress,
        thumbnail: thumbnailUrl, // Thêm thumbnail vào setupData
        
        zones: zones.map(z => ({
          id: parseInt(z.id), // tạm dùng để ánh xạ
          name: z.name,
          zoneType: z.type.toLowerCase(), // giữ lowercase như bạn yêu cầu
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

      console.log('Sending camera setup data:', setupData);

      const response = await fetch("http://localhost:8081/api/cameras/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setupData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to setup camera: ${errorData}`);
      }

      alert("Camera setup successfully!");
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error("Setup error:", error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Show loading state while fetching zone ID
  if (isLoadingZoneId) {
    return (
      <div className="flex h-screen">
        <Sidebar defaultActiveItem = "cameras"/>
        <div className="flex flex-col flex-grow overflow-auto">
          <Header title="Add New Camera" />
          <div className="p-6 max-w-6xl mx-auto w-full">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">Loading...</div>
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
        <Header title="Add New Camera" />

        <div className="p-6 max-w-7xl mx-auto w-full">
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
              
              {/* Search box moved outside map */}
              <div className="mb-4">
                <div className="flex max-w-md gap-2">
                  <div className="flex-grow relative">
                    <form onSubmit={handleSearch} className="flex">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Search location in Vietnam..."
                        className="flex-grow p-2 text-sm border rounded-l focus:ring focus:ring-blue-300 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700"
                      >
                        Search
                      </button>
                    </form>
                    
                    {/* Search Suggestions */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b shadow-lg z-[1000] max-h-48 overflow-y-auto">
                        {searchSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="text-sm font-medium text-gray-900">
                              {suggestion.display_name.split(',')[0]}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {suggestion.display_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={getCurrentLocationManually}
                    disabled={isGettingLocation}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-green-400 flex items-center gap-2"
                  >
                    {isGettingLocation ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Getting...
                      </>
                    ) : (
                      <>
                        📍 My Location
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="h-80 border rounded">
                <MapContainer
                  center={[21.0278, 105.8342]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  ref={setMapRef}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationPicker 
                    onLocationSelect={handleLocationSelect} 
                    currentLocation={currentLocation}
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

              
              <ZoneCanvas
              
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
                Add Camera
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}