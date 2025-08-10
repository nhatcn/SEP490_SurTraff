import { useState, useEffect } from "react";
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
import SubmitButton from "../../../components/Button/SubmitButton";

const markerIconUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png";
const markerShadowUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png";

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

// Remove unused component
export default function AddCamera() {
  const [mapRef, setMapRef] = useState<L.Map | null>(null);

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

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      cameraForm.cleanup();
    };
  }, []);

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

  // Show loading state while fetching zone ID or violation types
  if (isLoadingZoneId || cameraForm.isLoadingViolationTypes) {
    return (
      <div className="flex h-screen">
        <Sidebar defaultActiveItem="cameras"/>
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

        <div className="p-6 max-w-8xl mx-auto w-full">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-6">Camera Details</h2>

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
                      <span>✅ Thumbnail extracted successfully!</span>
                      <img 
                        src={cameraForm.thumbnailUrl} 
                        alt="Camera thumbnail preview" 
                        className="h-12 w-16 object-cover rounded border"
                      />
                    </div>
                    <div className="text-green-600 text-xs mt-1">
                      You can now configure zones below.
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
                    onLocationSelect={cameraForm.handleLocationSelect} 
                    currentLocation={currentLocation}
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
                onClick={() => cameraForm.navigate("/cameras")}
                className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={cameraForm.handleSubmit}
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
