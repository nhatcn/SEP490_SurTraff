import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import EditButton from '../Button/EditButton';
import ConfirmDialog from '../UI/PopUp/ConfirmDialog';

interface AccidentType {
  id: number;
  camera_id: number;
  camera: {
    id: number;
    name: string;
  };
  image_url: string;
  description: string;
  video_url: string;
  location: string;
  accident_time: string;
  created_at: string;
  user_fullName: string;
  user_email: string;
  licensePlate: string;
  status: string;
}

function getYouTubeEmbedUrl(url: string | null): string | undefined {
  if (!url) return undefined;

  const videoIdMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : url;
}

export default function AccidentDetailsTable() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [accident, setAccident] = useState<AccidentType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageKey, setImageKey] = useState(Date.now()); // For forcing re-render

  useEffect(() => {
    setLoading(true);
    setImageLoading(true); // Reset image loading state
    fetch(`http://localhost:8081/api/accident/${id}`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched accident data:", data);
        setAccident({
          ...data,
          camera: { id: data.camera_id, name: data.name || "Unknown" },
          accident_time: new Date(data.accident_time).toISOString(),
          created_at: new Date(data.created_at).toISOString(),
          user_fullName: data.user_fullName || "No data",
          user_email: data.user_email || "No data",
          licensePlate: data.licensePlate || "No data",
          status: data.status ? data.status.toLowerCase() : "unknown",
        });
        setEditDescription(data.description || "");
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch accident data:", error);
        setError("Failed to load accident data");
        setLoading(false);
        setImageLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    if (!accident) return;

    try {
      const updatedAccident = { description: editDescription };
      const res = await fetch(`http://localhost:8081/api/accident/${accident.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedAccident),
      });

      const updatedData = await res.json();
      if (!res.ok) {
        alert("Failed to update description.");
        return;
      }

      setAccident({
        ...updatedData,
        camera: { id: updatedData.camera_id, name: updatedData.name || "Unknown" },
        accident_time: new Date(updatedData.accident_time).toISOString(),
        created_at: new Date(updatedData.created_at).toISOString(),
        user_fullName: updatedData.user_fullName || "No data",
        user_email: updatedData.user_email || "No data",
        licensePlate: updatedData.licensePlate || "No data",
        status: updatedData.status ? updatedData.status.toLowerCase() : "unknown",
      });
      setIsEditing(false);
      setShowConfirm(false);
    } catch (error) {
      console.error("Error saving description:", error);
      alert("An error occurred while updating the description.");
    }
  };

  const handleApprove = async () => {
    if (!accident) return;

    try {
      const res = await fetch(`http://localhost:8081/api/accident/${accident.id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });

      const responseText = await res.text();
      let updatedData;
      try {
        updatedData = JSON.parse(responseText);
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError);
        alert("Invalid response from server.");
        return;
      }

      if (!res.ok) {
        alert("Failed to approve accident.");
        return;
      }

      setAccident({
        ...updatedData,
        camera: {
          id: updatedData.camera_id,
          name: updatedData.name || "Unknown",
        },
        accident_time: new Date(updatedData.accident_time).toISOString(),
        created_at: new Date(updatedData.created_at).toISOString(),
        user_fullName: updatedData.user_fullName || "No data",
        user_email: updatedData.user_email || "No data",
        licensePlate: updatedData.licensePlate || "No data",
        status: updatedData.status ? updatedData.status.toLowerCase() : "unknown",
      });

      navigate("/accidentdashboard");
    } catch (error) {
      console.error("Error approving accident:", error);
      alert("An error occurred while approving the accident.");
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", text: "Pending" },
      approved: { color: "bg-green-100 text-green-800 border-green-200", text: "Approved" },
      rejected: { color: "bg-red-100 text-red-800 border-red-200", text: "Rejected" },
    };

    const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      text: normalizedStatus,
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading accident details...</p>
        </div>
      </div>
    );
  }

  if (error || !accident) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-gray-600 text-lg">{error || "Accident not found"}</p>
          <button
            onClick={() => navigate("/accidentdashboard")}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/accidentdashboard")}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Accident Details</h1>
              <p className="text-gray-600 mt-1">Accident ID: #{accident.id}</p>
            </div>
            <div className="flex items-center space-x-4">
              {getStatusBadge(accident.status)}
              {!isEditing ? (
                <EditButton
                  onClick={() => setIsEditing(true)}
                  size="md"
                  variant="icon"
                />
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditDescription(accident.description || "");
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Accident Time</p>
                  <p className="text-gray-900">{new Date(accident.accident_time).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Reported At</p>
                  <p className="text-gray-900">{new Date(accident.created_at).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="text-gray-900">{accident.location}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Camera</p>
                  <p className="text-gray-900">{accident.camera.name}</p>
                </div>
              </div>
            </div>

            {/* Owner Information Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Owner Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Full Name</p>
                  <p className="text-gray-900">{accident.user_fullName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-gray-900">{accident.user_email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">License Plate</p>
                  <p className="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">{accident.licensePlate}</p>
                </div>
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Description
              </h2>
              {isEditing ? (
                <textarea
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter accident description..."
                />
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {accident.description || "No description available."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Media */}
          <div className="space-y-6">
            {/* Accident Image Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Accident Image
              </h2>
              <div className="relative">
                {accident.image_url ? (
                  <>
                    {imageLoading && (
                      <div className="bg-gray-50 rounded-lg p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading image...</p>
                      </div>
                    )}
                    <img
                      key={imageKey} // Force re-render on key change
                      src={`${accident.image_url}?t=${Date.now()}`}
                      alt="Accident"
                      className="w-full rounded-lg shadow-sm object-contain"
                      style={{ maxHeight: "400px", minHeight: "200px", display: imageLoading ? "none" : "block" }}
                      data-image-url={accident.image_url} // Debugging attribute
                      onLoad={() => {
                        console.log("Image loaded successfully:", accident.image_url);
                        setImageLoading(false);
                      }}
                      onError={(e) => {
                        console.error("Failed to load image:", accident.image_url);
                        setTimeout(() => {
                          e.currentTarget.src = "https://via.placeholder.com/400x300?text=Image+Not+Found";
                          setImageLoading(false);
                          setImageKey(Date.now()); // Update key to force re-render
                        }, 1000);
                      }}
                    />
                  </>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-gray-500">No image available for this accident</p>
                  </div>
                )}
              </div>
            </div>

            {/* Accident Video Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Accident Video
              </h2>
              {accident.video_url ? (
                <div className="relative">
                  {getYouTubeEmbedUrl(accident.video_url)?.includes("youtube.com") ? (
                    <iframe
                      className="w-full rounded-lg shadow-sm"
                      style={{ height: "250px" }}
                      src={getYouTubeEmbedUrl(accident.video_url)}
                      title="Accident Video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <>
                      <video
                        src={accident.video_url}
                        controls
                        className="w-full rounded-lg shadow-sm"
                        style={{ maxHeight: "250px" }}
                        onError={(e) => {
                          console.error("Failed to load video:", accident.video_url);
                          e.currentTarget.style.display = "none";
                          if (e.currentTarget.nextElementSibling) {
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block";
                          }
                        }}
                      />
                      <div
                        className="bg-gray-50 rounded-lg p-8 text-center"
                        style={{ display: "none" }}
                      >
                        <svg
                          className="w-12 h-12 text-gray-400 mx-auto mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-gray-500">Failed to load video</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <svg
                    className="w-12 h-12 text-gray-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-500">No video available for this accident</p>
                </div>
              )}
            </div>

            {/* Action Button */}
            {accident.status === "pending" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <button
                  onClick={handleApprove}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Approve Accident
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Confirm Save Changes"
        message="Are you sure you want to save the updated description?"
        onConfirm={handleSave}
        onCancel={() => setShowConfirm(false)}
        confirmButtonText="Save Changes"
        confirmButtonColor="bg-green-600 hover:bg-green-700"
      />
    </div>
  );
}