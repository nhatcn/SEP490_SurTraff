import { useState, useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, LayersControl, ZoomControl, CircleMarker } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import Sidebar from "../../components/Sidebar"
import Header from "../../components/Header"
import CameraDetail from "../../components/CameraDetail"

// Custom camera icon - video camera with blue color
const cameraIcon = new L.Icon({
  iconUrl: "https://tse3.mm.bing.net/th/id/OIP.rDwv7jSrMyrexUsSSdYd8wHaHa?rs=1&pid=ImgDetMain", // Video camera icon
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
  className: "blue-icon" // We'll add a CSS class to apply blue color
})

// Status colors
const statusColors = {
  online: "#4CAF50",   // Green
  offline: "#F44336", // Red
  warning: "#FF9800"  // Orange/Yellow
}

function MapDashboard() {
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [mapCenter, setMapCenter] = useState([10.75, 106.67]) // Default center (Vietnam)
  const [mapZoom, setMapZoom] = useState(6)
  const [filterStatus, setFilterStatus] = useState("all")
  const mapRef = useRef(null)

  useEffect(() => {
    fetch("http://localhost:8000/api/cameras")
      .then((res) => res.json())
      .then((data) => {
        setCameras(data)
        if (data.length > 0) {
          setSelectedCamera(data[0])

          if (data.length > 1) {
            const validCoords = data.filter(c => c.latitude && c.longitude)
            if (validCoords.length > 0) {
              const latSum = validCoords.reduce((sum, cam) => sum + cam.latitude, 0)
              const lngSum = validCoords.reduce((sum, cam) => sum + cam.longitude, 0)
              setMapCenter([latSum / validCoords.length, lngSum / validCoords.length])
              setMapZoom(7)
            }
          }
        }
      })
      .catch((err) => console.error("Error loading cameras:", err))
  }, [])
  
  // Filter cameras by status
  const filteredCameras = filterStatus === "all" 
    ? cameras 
    : cameras.filter(camera => camera.status === filterStatus)

  // Handle camera selection
  const handleCameraSelect = (camera) => {
    setSelectedCamera(camera)
    
    // Fly to the selected camera
    if (mapRef.current && camera.latitude && camera.longitude) {
      mapRef.current.flyTo([camera.latitude, camera.longitude], 12, {
        duration: 1.5
      })
    }
  }

  return (
    <div className="d-flex h-100">
      <Sidebar />
      <div className="d-flex flex-column flex-grow-1 overflow-hidden">
        <Header title="Camera Location Map" />
        <div className="d-flex p-3 gap-3 flex-grow-1 overflow-hidden">
          <div className="camera-grid-container">
            <div className="modern-map-controls mb-3">
              <div className="filter-controls">
                <span className="filter-label">Filter by status:</span>
                <div className="filter-buttons">
                  <button 
                    className={`status-btn ${filterStatus === "all" ? "active" : ""}`}
                    onClick={() => setFilterStatus("all")}
                  >
                    All
                  </button>
                  <button 
                    className={`status-btn online ${filterStatus === "online" ? "active" : ""}`}
                    onClick={() => setFilterStatus("online")}
                  >
                    Online
                  </button>
                  <button 
                    className={`status-btn offline ${filterStatus === "offline" ? "active" : ""}`}
                    onClick={() => setFilterStatus("offline")}
                  >
                    Offline
                  </button>
                  <button 
                    className={`status-btn warning ${filterStatus === "warning" ? "active" : ""}`}
                    onClick={() => setFilterStatus("warning")}
                  >
                    Warning
                  </button>
                </div>
              </div>
              <div className="map-info">
                <div className="camera-count">
                  <strong>{filteredCameras.length}</strong> cameras displayed
                </div>
              </div>
            </div>
            
            <div className="modern-map-container">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                zoomControl={false}
                style={{ height: "100%", width: "100%" }}
                whenCreated={(map) => { mapRef.current = map }}
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
                  <div key={camera.id}>
                    <Marker
                      position={[camera.latitude || 10.75, camera.longitude || 106.67]}
                      icon={cameraIcon}
                      eventHandlers={{
                        click: () => handleCameraSelect(camera),
                      }}
                    >
                      <Popup className="modern-popup">
                        <div className="camera-popup">
                          <div className={`status-indicator ${camera.status || "unknown"}`}></div>
                          <h4>{camera.name}</h4>
                          <p>{camera.location}</p>
                          <button 
                            className="view-details-btn"
                            onClick={() => handleCameraSelect(camera)}
                          >
                            View Details
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                    {/* Add pulse effect circle for cameras */}
                    <CircleMarker
                      center={[camera.latitude || 10.75, camera.longitude || 106.67]}
                      pathOptions={{ 
                        color: statusColors[camera.status] || "#999",
                        fillColor: statusColors[camera.status] || "#999",
                        fillOpacity: 0.3
                      }}
                      radius={10}
                      className="pulse-circle"
                    />
                  </div>
                ))}
              </MapContainer>
            </div>
          </div>

          <div className="camera-detail-container">
           
              <CameraDetail camera={selectedCamera} />
           
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapDashboard