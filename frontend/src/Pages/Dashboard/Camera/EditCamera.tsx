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

// Custom hooks
import { useCameraForm } from "../../../hooks/Camera/useCameraForm";
import { useCurrentLocation } from "../../../hooks/Camera/useCurrentLocation";
import { useLocationSearch } from "../../../hooks/Camera/useLocationSearch";
import { useZoneId } from "../../../hooks/Camera/useZoneId";
import {API_URL_BE,  API_URL_FAST } from "../../../components/Link/LinkAPI";

const markerIconUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png";
const markerShadowUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png";

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
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [originalCameraData, setOriginalCameraData] = useState<CameraData | null>(null);

  // Custom hooks
  const cameraForm = useCameraForm();
  const { nextZoneId, setNextZoneId, isLoadingZoneId } = useZoneId();
  const { currentLocation, isGettingLocation, getCurrentLocationManually } = useCurrentLocation({ mapRef });
  const {
    searchQuery,
    setSearchQuery,
    searchSuggestions,
    showSuggestions,
    setShowSuggestions,
    handleSearch,
    handleSuggestionClick
  } = useLocationSearch({ mapRef, onLocationSelect: cameraForm.handleLocationSelect });

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

  // Load camera data on component mount
  useEffect(() => {
    const fetchCameraData = async () => {
      if (!id) {
        navigate("/cameras");
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(API_URL_BE + `api/cameras/${id}`);
        
        if (!response.ok) {
          throw new Error("Camera not found");
        }

        const cameraData: CameraData = await response.json();
        console.log('Camera data from API:', cameraData);
        setOriginalCameraData(cameraData);

        // Set basic camera info using cameraForm methods
        cameraForm.setName(cameraData.name);
        cameraForm.setStreamUrl(cameraData.streamUrl);
        cameraForm.setLocationAddress(cameraData.location || "");
        // Use handleLocationSelect to set location properly
        cameraForm.handleLocationSelect(cameraData.latitude, cameraData.longitude, cameraData.location || "");

        // Set speed limit and violation type
        cameraForm.setSpeedLimit(cameraData.maxSpeed || 50);
        cameraForm.setViolationTypeId(cameraData.violationTypeId || null);

        // Set thumbnail from API if available, otherwise try to extract
        if (cameraData.thumbnail) {
          cameraForm.setThumbnailUrl(cameraData.thumbnail);
          console.log('Using existing thumbnail from API:', cameraData.thumbnail);
        } else if (cameraData.streamUrl) {
          console.log('No thumbnail found, extracting from stream URL');
          cameraForm.extractThumbnail(cameraData.streamUrl);
        }

        // Transform and set zones
        const transformedZones = (cameraData.zones || []).map(zone => ({
          id: zone.id.toString(),
          type: zone.zoneType as "lane" | "line" | "light" | "speed",
          coordinates: JSON.parse(zone.coordinates),
          name: zone.name,
          color: getZoneColor(zone.zoneType)
        }));
        cameraForm.setZones(transformedZones);

        // Transform and set lane directions
        const transformedLaneDirections = (cameraData.laneMovements || []).map(dir => {
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
        cameraForm.setLaneDirections(transformedLaneDirections);

        // Transform and set light zone mappings
        const transformedLightMappings = (cameraData.zoneLightLaneLinks || []).map(mapping => {
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
        cameraForm.setLightZoneMappings(transformedLightMappings);

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

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      cameraForm.cleanup();
    };
  }, [cameraForm]);

  const handleGetCurrentLocation = async () => {
    const result = await getCurrentLocationManually();
    if (result) {
      cameraForm.handleLocationSelect(result.lat, result.lng, result.address);
    }
  };

  const handleExtractThumbnail = () => {
    if (cameraForm.streamUrl.trim()) {
      cameraForm.extractThumbnail(cameraForm.streamUrl);
    }
  };

  const handleSubmit = async () => {
    if (!cameraForm.name || !cameraForm.streamUrl || !cameraForm.location.selected || !cameraForm.locationAddress) {
      alert("Please fill in all required fields.");
      return;
    }

    if (!cameraForm.thumbnailUrl) {
      alert("Please extract a thumbnail from the stream URL first.");
      return;
    }

    if (cameraForm.violationTypeId === null) {
      alert("Please select a violation type.");
      return;
    }

    try {
      const updateData = {
        cameraName: cameraForm.name,
        cameraUrl: cameraForm.streamUrl,
        latitude: cameraForm.location.lat,
        longitude: cameraForm.location.lng,
        location: cameraForm.locationAddress,
        thumbnail: cameraForm.thumbnailUrl,
        maxSpeed: cameraForm.speedLimit,
        violationTypeId: cameraForm.violationTypeId,
        zones: cameraForm.zones.map(z => ({
          id: parseInt(z.id),
          name: z.name,
          zoneType: z.type.toLowerCase(),
          coordinates: JSON.stringify(z.coordinates)
        })),
        zoneLightLaneLinks: cameraForm.lightZoneMappings.map(mapping => ({
          lightZoneId: parseInt(mapping.lightZoneId),
          laneZoneId: parseInt(mapping.laneZoneId)
        })),
        laneMovements: cameraForm.laneDirections.map(dir => ({
          fromLaneZoneId: parseInt(dir.fromZoneId),
          toLaneZoneId: parseInt(dir.toZoneId)
        }))
      };

      console.log('Sending camera update data:', updateData);

      const response = await fetch(API_URL_BE + `api/cameras/${id}`, {
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

  // Show loading state while fetching data
  if (loading || isLoadingZoneId || cameraForm.isLoadingViolationTypes) {
    return (
      <div className="flex h-screen">
        <Sidebar defaultActiveItem="cameras"/>
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
        <Header title={`Edit Camera: ${cameraForm.name}`} />

        <div className="p-6 max-w-8xl mx-auto w-full">
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
                  value={cameraForm.name}
                  onChange={e => cameraForm.setName(e.target.value)}
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
                    value={cameraForm.streamUrl}
                    onChange={e => cameraForm.setStreamUrl(e.target.value)}
                    className="flex-1 p-2 border rounded focus:ring focus:ring-blue-300"
                    placeholder="rtsp:// or http:// stream URL"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleExtractThumbnail}
                    disabled={!cameraForm.streamUrl.trim() || cameraForm.isExtractingThumbnail}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    {cameraForm.isExtractingThumbnail ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Extracting...
                      </>
                    ) : (
                      <>
                        📷 Extract Thumbnail
                      </>
                    )}
                  </button>
                </div>
                
                {/* Thumbnail extraction status */}
                {cameraForm.thumbnailError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                    <div className="text-red-700 text-sm">
                      <strong>Error:</strong> {cameraForm.thumbnailError}
                    </div>
                  </div>
                )}
                
                {cameraForm.thumbnailUrl && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="text-green-700 text-sm flex items-center gap-2">
                      <span>✅ Thumbnail {originalCameraData?.thumbnail ? 'loaded' : 'extracted'} successfully!</span>
                      <img 
                        src={cameraForm.thumbnailUrl} 
                        alt="Camera thumbnail preview" 
                        className="h-12 w-16 object-cover rounded border"
                      />
                    </div>
                    <div className="text-green-600 text-xs mt-1">
                      {originalCameraData?.thumbnail ? 
                        'Using saved thumbnail from database. You can re-extract if needed.' :
                        'You can now configure zones below.'
                      }
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
                    onClick={handleGetCurrentLocation}
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
                  center={cameraForm.location.selected ? [cameraForm.location.lat, cameraForm.location.lng] : [21.0278, 105.8342]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  key={`${cameraForm.location.lat}-${cameraForm.location.lng}`}
                  ref={setMapRef}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationPicker 
                    onLocationSelect={cameraForm.handleLocationSelect}
                    currentLocation={currentLocation}
                    initialLocation={cameraForm.location}
                  />
                </MapContainer>
              </div>
              {cameraForm.location.selected && (
                <div className="mt-2 text-sm text-gray-600">
                  Selected coordinates: {cameraForm.location.lat.toFixed(6)}, {cameraForm.location.lng.toFixed(6)}
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block mb-2 font-medium">Location Address *</label>
              <input
                type="text"
                value={cameraForm.locationAddress}
                onChange={e => cameraForm.setLocationAddress(e.target.value)}
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
                <label className="block mb-2 font-medium">Speed Limit: {cameraForm.speedLimit} km/h</label>
                <input
                  type="range"
                  min="40"
                  max="120"
                  step="5"
                  value={cameraForm.speedLimit}
                  onChange={e => cameraForm.setSpeedLimit(Number(e.target.value))}
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
                  value={cameraForm.violationTypeId || ""}
                  onChange={e => cameraForm.setViolationTypeId(Number(e.target.value))}
                  className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                  required
                >
                  <option value="">Select violation type...</option>
                  {cameraForm.violationTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.typeName}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-sm text-gray-500">
                  Select the primary type of violation this camera will detect
                </div>
                {cameraForm.violationTypes.length === 0 && !cameraForm.isLoadingViolationTypes && (
                  <div className="mt-1 text-sm text-red-500">
                    Failed to load violation types. Please refresh the page.
                  </div>
                )}
              </div>
            </div>

            {/* Zone Configuration - Only show if thumbnail is available */}
            {cameraForm.thumbnailUrl ? (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4">Camera Thumbnail & Zones</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Fixed ZoneCanvas */}
                  <div className="sticky top-4">
                    <ZoneCanvas
                      zones={cameraForm.zones}
                      setZones={cameraForm.setZones}
                      thumbnailUrl={cameraForm.thumbnailUrl}
                      nextZoneId={nextZoneId}
                      setNextZoneId={setNextZoneId}
                      onDeleteZone={cameraForm.handleDeleteZone}
                    />
                  </div>

                  {/* Configuration sections */}
                  <div className="space-y-6">
                    {cameraForm.zones.length > 0 && (
                      <>
                        <LaneDirectionConfig
                          zones={cameraForm.zones}
                          laneDirections={cameraForm.laneDirections}
                          setLaneDirections={cameraForm.setLaneDirections}
                        />

                        <LightZoneMappingConfig
                          zones={cameraForm.zones}
                          lightZoneMappings={cameraForm.lightZoneMappings}
                          setLightZoneMappings={cameraForm.setLightZoneMappings}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4">Camera Thumbnail & Zones</h3>
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-gray-500 mb-2">
                    📷 Please extract a thumbnail from the stream URL first
                  </div>
                  <div className="text-sm text-gray-400">
                    Enter a valid stream URL above and click "Extract Thumbnail" to configure zones
                  </div>
                </div>
              </div>
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