import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../../components/Layout/Header";
import Sidebar from "../../../components/Layout/Sidebar";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import ZoneCanvas from "../../../components/Camera/ZoneCanvas";
import LaneDirectionConfig from "../../../components/Camera/LaneDirectionConfig";
import LightZoneMappingConfig from "../../../components/Camera/LightZoneMappingConfig";
import API_URL_BE from "../../../components/Link/LinkAPI";

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

interface CameraData {
  id: number;
  name: string;
  streamUrl: string;
  latitude: number;
  longitude: number;
  location: string;
  thumbnail?: string;
  maxSpeed?: number;
  violationTypeId?: number;
  zones?: any[];
  zoneLightLaneLinks?: any[];
  laneMovements?: any[];
}

// Type for violation type from API
interface ViolationType {
  id: number;
  typeName: string;
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
  currentLocation,
  initialLocation
}: { 
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  currentLocation: [number, number] | null;
  initialLocation: { lat: number; lng: number; selected: boolean };
}) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLocation.selected ? [initialLocation.lat, initialLocation.lng] : null
  );

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
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [laneDirections, setLaneDirections] = useState<LaneDirection[]>([]);
  const [lightZoneMappings, setLightZoneMappings] = useState<LightZoneMapping[]>([]);
  const [nextZoneId, setNextZoneId] = useState<number>(1);
  const [originalCameraData, setOriginalCameraData] = useState<CameraData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);

  // Speed configuration state
  const [speedLimit, setSpeedLimit] = useState<number>(50);
  
  // Violation type state
  const [violationTypeId, setViolationTypeId] = useState<number | null>(null);
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [isLoadingViolationTypes, setIsLoadingViolationTypes] = useState(false);

  // Thumbnail extraction state
  const [isExtractingThumbnail, setIsExtractingThumbnail] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);

  // Helper function to get zone color based on type
  const getZoneColor = (zoneType: string): string => {
    switch(zoneType.toLowerCase()) {
      case 'lane': return "#3B82F6";
      case 'line': return "#EF4444"; 
      case 'light': return "#F59E0B";
      case 'speed': return "#10B981";
      default: return "#888";
    }
  };

  // Fetch violation types from API
  useEffect(() => {
    const fetchViolationTypes = async () => {
      setIsLoadingViolationTypes(true);
      try {
        const response = await fetch(API_URL_BE +"api/violation-type");
        if (!response.ok) {
          throw new Error(`Failed to fetch violation types: ${response.status}`);
        }
        const data: ViolationType[] = await response.json();
        setViolationTypes(data);
      } catch (error) {
        console.error("Error fetching violation types:", error);
        setViolationTypes([]);
      } finally {
        setIsLoadingViolationTypes(false);
      }
    };

    fetchViolationTypes();
  }, []);

  // Get current location on component mount
  useEffect(() => {
    const getCurrentLocation = () => {
      setIsGettingLocation(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentLocation([latitude, longitude]);
            setIsGettingLocation(false);
          },
          (error) => {
            console.warn("Error getting location:", error);
            setIsGettingLocation(false);
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

  // Load camera data on component mount
  useEffect(() => {
    const fetchCameraData = async () => {
      if (!id) {
        navigate("/cameras");
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(API_URL_BE +`api/cameras/${id}`);
        
        if (!response.ok) {
          throw new Error("Camera not found");
        }

        const cameraData: CameraData = await response.json();
        console.log('Camera data from API:', cameraData);
        setOriginalCameraData(cameraData);

        // Set basic camera info
        setName(cameraData.name);
        setStreamUrl(cameraData.streamUrl);
        setLocationAddress(cameraData.location || "");
        setLocation({
          lat: cameraData.latitude,
          lng: cameraData.longitude,
          selected: true
        });

        // Set speed limit and violation type
        setSpeedLimit(cameraData.maxSpeed || 50);
        setViolationTypeId(cameraData.violationTypeId || null);

        // Set thumbnail from API if available, otherwise try to extract
        if (cameraData.thumbnail) {
          setThumbnailUrl(cameraData.thumbnail);
          console.log('Using existing thumbnail from API:', cameraData.thumbnail);
        } else if (cameraData.streamUrl) {
          console.log('No thumbnail found, extracting from stream URL');
          extractThumbnail(cameraData.streamUrl);
        }

        // Transform and set zones
        const transformedZones: Zone[] = (cameraData.zones || []).map(zone => ({
          id: zone.id.toString(),
          type: zone.zoneType as "lane" | "line" | "light" | "speed",
          coordinates: JSON.parse(zone.coordinates),
          name: zone.name,
          color: getZoneColor(zone.zoneType)
        }));
        setZones(transformedZones);

        // Transform and set lane directions
        const transformedLaneDirections: LaneDirection[] = (cameraData.laneMovements || []).map(dir => {
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
        const transformedLightMappings: LightZoneMapping[] = (cameraData.zoneLightLaneLinks || []).map(mapping => {
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
        const maxZoneId = transformedZones.length > 0 
          ? Math.max(...transformedZones.map(z => parseInt(z.id)), 0)
          : 0;
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

  const extractThumbnail = async (streamUrl: string) => {
    if (!streamUrl.trim()) {
      setThumbnailError("Stream URL is required");
      return;
    }

    setIsExtractingThumbnail(true);
    setThumbnailError(null);

    try {
      const response = await fetch("http://localhost:8000/api/thumbnail/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stream_url: streamUrl })
      });

      if (!response.ok) {
        let errorMessage = `Failed to extract thumbnail: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use default error message
        }
        throw new Error(errorMessage);
      }

      // Convert the image response to a blob and create object URL
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      
      setThumbnailUrl(imageUrl);
      setThumbnailError(null);
    } catch (error: unknown) {
      console.error("Thumbnail extraction error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setThumbnailError(errorMessage);
      setThumbnailUrl(""); // Clear thumbnail on error
    } finally {
      setIsExtractingThumbnail(false);
    }
  };

  const handleStreamUrlChange = (url: string) => {
    setStreamUrl(url);
    // Only clear thumbnail if it was extracted (not from database)
    if (thumbnailUrl && !originalCameraData?.thumbnail) {
      URL.revokeObjectURL(thumbnailUrl);
      setThumbnailUrl("");
    }
    setThumbnailError(null);
  };

  const handleExtractThumbnail = () => {
    if (streamUrl.trim()) {
      extractThumbnail(streamUrl);
    }
  };

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

    if (!thumbnailUrl) {
      alert("Please extract a thumbnail from the stream URL first.");
      return;
    }

    if (violationTypeId === null) {
      alert("Please select a violation type.");
      return;
    }

    try {
      const updateData = {
        cameraName: name,
        cameraUrl: streamUrl,
        latitude: location.lat,
        longitude: location.lng,
        location: locationAddress,
        thumbnail: thumbnailUrl,
        maxSpeed: speedLimit,
        violationTypeId: violationTypeId,
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

      const response = await fetch(`API_URL_BEapi/cameras/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update camera: ${errorData}`);
      }

      alert("Camera updated successfully!");
      
      // Clean up object URL before navigating (only for extracted thumbnails)
      if (thumbnailUrl && thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailUrl);
      }
      
      navigate("/cameras");
    } catch (error: unknown) {
      console.error("Update error:", error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Cleanup function to revoke object URLs (only for extracted thumbnails)
  useEffect(() => {
    return () => {
      // Only revoke if it's an object URL (extracted), not a regular URL from database
      if (thumbnailUrl && thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [thumbnailUrl]);

  if (loading || isLoadingViolationTypes) {
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={streamUrl}
                    onChange={e => handleStreamUrlChange(e.target.value)}
                    className="flex-1 p-2 border rounded focus:ring focus:ring-blue-300"
                    placeholder="rtsp:// or http:// stream URL"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleExtractThumbnail}
                    disabled={!streamUrl.trim() || isExtractingThumbnail}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    {isExtractingThumbnail ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Extracting...
                      </>
                    ) : (
                      <>
                        📷 Re-extract Thumbnail
                      </>
                    )}
                  </button>
                </div>
                
                {/* Thumbnail status */}
                {thumbnailError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                    <div className="text-red-700 text-sm">
                      <strong>Error:</strong> {thumbnailError}
                    </div>
                  </div>
                )}
                
                {thumbnailUrl && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="text-green-700 text-sm flex items-center gap-2">
                      <span>✅ Thumbnail available</span>
                      <img 
                        src={thumbnailUrl} 
                        alt="Camera thumbnail preview" 
                        className="h-12 w-16 object-cover rounded border"
                      />
                    </div>
                    <div className="text-green-600 text-xs mt-1">
                      {originalCameraData?.thumbnail ? 
                        'Using saved thumbnail from database. Click "Re-extract" to generate a new one.' :
                        'Thumbnail extracted from stream. You can configure zones below.'
                      }
                    </div>
                  </div>
                )}

                {!thumbnailUrl && !isExtractingThumbnail && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="text-yellow-700 text-sm">
                      ⚠️ No thumbnail available. Please extract one to configure zones.
                    </div>
                  </div>
                )}
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
                  center={location.selected ? [location.lat, location.lng] : [21.0278, 105.8342]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  key={`${location.lat}-${location.lng}`} // Force re-render when location changes
                  ref={setMapRef}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationPicker 
                    onLocationSelect={handleLocationSelect}
                    currentLocation={currentLocation}
                    initialLocation={location}
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

            {/* Speed Limit Configuration and Violation Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block mb-2 font-medium">Speed Limit: {speedLimit} km/h</label>
                <input
                  type="range"
                  min="40"
                  max="120"
                  step="5"
                  value={speedLimit}
                  onChange={e => setSpeedLimit(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>40 km/h</span>
                  <span>120 km/h</span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Set the speed limit for this camera location
                </div>
              </div>

              <div>
                <label className="block mb-2 font-medium">Violation Type *</label>
                <select
                  value={violationTypeId || ""}
                  onChange={e => setViolationTypeId(Number(e.target.value))}
                  className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                  required
                >
                  <option value="">Select violation type...</option>
                  {violationTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.typeName}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-sm text-gray-500">
                  Select the primary type of violation this camera will detect
                </div>
                {violationTypes.length === 0 && !isLoadingViolationTypes && (
                  <div className="mt-1 text-sm text-red-500">
                    Failed to load violation types. Please refresh the page.
                  </div>
                )}
              </div>
            </div>

            {/* Zone Configuration - Show if thumbnail is available */}
            {thumbnailUrl ? (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4">Camera Thumbnail & Zones</h3>
                
                <div className="mb-4 p-4 bg-blue-50 rounded">
                  <h4 className="font-medium text-blue-900 mb-2">Zone Management</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Current zones: {zones.length} total
                    {originalCameraData?.zones && (
                      <span> (Original: {originalCameraData.zones.length}, Modified: {zones.length - originalCameraData.zones.length >= 0 ? '+' + (zones.length - originalCameraData.zones.length) : zones.length - originalCameraData.zones.length})</span>
                    )}
                  </p>
                  
                  <div className="mb-4">
                    <label className="block mb-2 font-medium">Select Zone Type to Draw</label>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setActiveZoneType("lane")}
                        className={`px-4 py-2 rounded ${activeZoneType === "lane"
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-800 hover:bg-blue-200"}`}
                      >
                        🛣️ Lane Zone
                      </button>
                      <button
                        onClick={() => setActiveZoneType("line")}
                        className={`px-4 py-2 rounded ${activeZoneType === "line"
                          ? "bg-red-600 text-white"
                          : "bg-red-100 text-red-800 hover:bg-red-200"}`}
                      >
                        📏 Line Zone
                      </button>
                      <button
                        onClick={() => setActiveZoneType("light")}
                        className={`px-4 py-2 rounded ${activeZoneType === "light"
                          ? "bg-amber-600 text-white"
                          : "bg-amber-100 text-amber-800 hover:bg-amber-200"}`}
                      >
                        🚦 Light Zone
                      </button>
                      {activeZoneType && (
                        <button
                          onClick={() => setActiveZoneType(null)}
                          className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                        >
                          ❌ Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {originalCameraData?.thumbnail && (
                    <div className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                      💾 Using saved thumbnail from database. All existing zones are preserved.
                    </div>
                  )}
                </div>

                <ZoneCanvas
                  zones={zones}
                  setZones={setZones}
                  thumbnailUrl={thumbnailUrl}
                  nextZoneId={nextZoneId}
                  setNextZoneId={setNextZoneId}
                  onDeleteZone={handleDeleteZone}
                />
              </div>
            ) : (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4">Camera Thumbnail & Zones</h3>
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-gray-500 mb-2">
                    📷 No thumbnail available
                  </div>
                  <div className="text-sm text-gray-400">
                    Please extract a thumbnail from the stream URL to configure zones
                  </div>
                </div>
              </div>
            )}

            {/* Lane Direction and Light Zone Mappings - Only show if zones exist */}
            {zones.length > 0 && (
              <>
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
              </>
            )}

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
