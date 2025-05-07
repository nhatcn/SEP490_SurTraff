// CameraDetail.jsx
import PropTypes from "prop-types"
import { MapPin } from "lucide-react"
import "./CameraDetail.css"

function CameraDetail({ camera }) {
  if (!camera) {
    return (
      <div className="camera-detail">
        <div className="empty-state">
          <div className="empty-state-content">
            <div className="empty-state-icon">
              <MapPin size={48} />
            </div>
            <h3>Chưa chọn camera</h3>
            <p>Vui lòng chọn một camera từ danh sách để xem chi tiết</p>
          </div>
        </div>
      </div>
    )
  }

  const processedVideoUrl = `http://localhost:8000/api/video/${camera.id}`

  return (
    <div className="camera-detail">
      <div className="camera-detail-image-container video-container">
        {processedVideoUrl ? (
          <img
            src={processedVideoUrl}
            alt={`Livestream from ${camera.name}`}
            className="camera-detail-video"
          />
        ) : (
          <div className="no-video-message">Không có video để hiển thị</div>
        )}
        
        <div className="live-indicator">
          <span className="live-dot"></span>
          LIVE
        </div>
      </div>

      <div className="camera-detail-body">
        <div className="camera-detail-header">
          <h2 className="camera-detail-title">{camera.name}</h2>
          <div
            className={`status-badge ${
              camera.status === "violation"
                ? "status-badge-danger"
                : "status-badge-success"
            }`}
          >
            {camera.status === "violation"
              ? "Vi phạm phát hiện"
              : "Bình thường"}
          </div>
        </div>

        <div className="camera-detail-location">
          <MapPin size={18} className="me-1" />
          {camera.location || "Không có vị trí"}
        </div>

        <p className="camera-detail-description">
          Mô tả: {camera.description || "Camera này được lắp đặt để phát hiện người."}
        </p>
      </div>
    </div>
  )
}

CameraDetail.propTypes = {
  camera: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    status: PropTypes.string,
    location: PropTypes.string,
    stream_url: PropTypes.string,
    description: PropTypes.string,
  }),
}

export default CameraDetail