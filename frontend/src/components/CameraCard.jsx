"use client"

import { Camera } from "lucide-react"
import "./CameraCard.css"

function CameraCard({ camera, isSelected, onClick }) {
  return (
    <div className={`camera-card ${isSelected ? "camera-card-selected" : ""}`} onClick={() => onClick(camera)}>
      <div className="camera-image-container">
        <img src={camera.thumbnail} alt={camera.name} className="camera-image" />
      </div>

      <div className="camera-card-body">
        <div className="camera-card-header">
          <h3 className="camera-title">{camera.name}</h3>
          <div
            className={`status-indicator ${camera.status === "violation" ? "status-violation" : "status-normal"}`}
          ></div>
        </div>

        <p className="camera-location">{camera.location}</p>

        <div className="camera-status">
          <span className={`status-text ${camera.status === "violation" ? "text-danger" : "text-success"}`}>
            Trạng thái: {camera.status === "violation" ? "Vị phạm phát hiện" : "Bình thường"}
          </span>
          <Camera size={14} className="camera-icon" />
        </div>
      </div>
    </div>
  )
}

export default CameraCard
