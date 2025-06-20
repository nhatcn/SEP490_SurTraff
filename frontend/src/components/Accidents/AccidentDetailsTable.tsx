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
  return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : undefined;
}

export default function AccidentDetailsTable() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [accident, setAccident] = useState<AccidentType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:8081/api/accident/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setAccident({
          ...data,
          camera: { id: data.camera_id, name: data.name || "Unknown" },
          accident_time: new Date(data.accident_time).toISOString(),
          created_at: new Date(data.created_at).toISOString(),
          user_fullName: data.user_fullName || "No data",
          user_email: data.user_email || "No data",
          licensePlate: data.licensePlate || "No data",
          status: data.status || "Unknown",
        });
        setEditDescription(data.description || "");
      })
      .catch((error) => console.error("Failed to fetch accident data:", error));
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
        status: updatedData.status || "Unknown",
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
        status: updatedData.status || "Unknown",
      });

      navigate("/accidentdashboard");
    } catch (error) {
      console.error("Error approving accident:", error);
      alert("An error occurred while approving the accident.");
    }
  };

  if (!accident) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600 text-lg">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 flex justify-between items-center">
        Accident Details
        {!isEditing ? (
          <EditButton
            onClick={() => setIsEditing(true)}
            size="md"
            variant="icon"
          />
        ) : (
          <div className="space-x-2">
            <button
              onClick={() => setShowConfirm(true)}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditDescription(accident.description || "");
              }}
              className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        )}
      </h2>

      <div className="grid grid-cols-2 gap-4 text-gray-700">
        <div>
          <p className="font-semibold">Accident ID:</p>
          <p>{accident.id}</p>
        </div>
        <div>
          <p className="font-semibold">Accident Time:</p>
          <p>{new Date(accident.accident_time).toLocaleString()}</p>
        </div>
        <div>
          <p className="font-semibold">Reported At:</p>
          <p>{new Date(accident.created_at).toLocaleString()}</p>
        </div>
        <div>
          <p className="font-semibold">Owner Name:</p>
          <p>{accident.user_fullName}</p>
        </div>
        <div>
          <p className="font-semibold">Owner Email:</p>
          <p>{accident.user_email}</p>
        </div>
        <div>
          <p className="font-semibold">License Plate:</p>
          <p>{accident.licensePlate}</p>
        </div>
        <div>
          <p className="font-semibold">Location:</p>
          <p>{accident.location}</p>
        </div>
        <div className="col-span-2">
          <p className="font-semibold">Description:</p>
          {isEditing ? (
            <textarea
              rows={4}
              className="border rounded px-2 py-1 w-full"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Enter accident description"
            />
          ) : (
            <p>{accident.description || "No description available."}</p>
          )}
        </div>
      </div>

      <div>
        <p className="font-semibold mb-2">Accident Image:</p>
        <img
          src={accident.image_url}
          alt="Accident"
          className="rounded-lg shadow w-full max-h-[400px] object-contain"
        />
      </div>

      <div>
        <p className="font-semibold mb-2">Accident Video:</p>
        {accident.video_url ? (
          getYouTubeEmbedUrl(accident.video_url) ? (
            <iframe
              className="w-full max-h-[400px] rounded-lg shadow"
              src={getYouTubeEmbedUrl(accident.video_url)}
              title="Accident Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={accident.video_url}
              controls
              className="w-full max-h-[400px] rounded-lg shadow"
            />
          )
        ) : (
          <p className="text-gray-500 italic">No video available for this accident.</p>
        )}
      </div>

      {accident.status === "pending" && (
        <div className="flex justify-end">
          <button
            onClick={handleApprove}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Approve
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirm}
        title="Confirm Save Changes?"
        message="Are you sure you want to save the updated description?"
        onConfirm={handleSave}
        onCancel={() => setShowConfirm(false)}
        confirmButtonText="Confirm"
        confirmButtonColor="bg-green-600 hover:bg-green-700"
      />
    </div>
  );
}
