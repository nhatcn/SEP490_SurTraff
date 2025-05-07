// CameraDashboard.jsx
import { useState, useEffect } from "react"
import Sidebar from "./Sidebar"
import Header from "./Header"
import CameraCard from "./CameraCard"
import CameraDetail from "./CameraDetail"
import "./CameraDashboard.css"

function CameraDashboard() {
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [cameras, setCameras] = useState([])

  useEffect(() => {
    // Fetch camera data from backend
    fetch("http://localhost:8000/api/cameras")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch camera data")
        }
        return res.json()
      })
      .then((data) => {
        console.log("Fetched cameras:", data)
        setCameras(data)

        // Chỉ chọn camera đầu tiên nếu chưa có camera nào được chọn
        setSelectedCamera((prevSelected) => {
          if (prevSelected === null && data.length > 0) {
            return data[0]
          }
          return prevSelected
        })
      })
      .catch((err) => {
        console.error("Error loading cameras:", err)
      })
  }, [])

  const handleCameraClick = (camera) => {
    setSelectedCamera(camera)
  }

  return (
    <div className="d-flex h-100">
      <Sidebar />
      <div className="d-flex flex-column flex-grow-1 overflow-hidden">
        <Header title="List of Violation Detection Cameras" />

        <div className="d-flex p-3 gap-3 flex-grow-1 overflow-hidden">
          <div className="camera-grid-container">
            <div className="row row-cols-3 g-3">
              {cameras.map((camera) => (
                <div className="col" key={camera.id}>
                  <CameraCard
                    camera={camera}
                    isSelected={selectedCamera && selectedCamera.id === camera.id}
                    onClick={handleCameraClick}
                  />
                </div>
              ))}
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

export default CameraDashboard
