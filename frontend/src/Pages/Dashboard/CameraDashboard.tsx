import { useState, useEffect } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import Header from "../../components/Layout/Header";
import CameraCard from "../../components/Camera/CameraCard";
import CameraDetail from "../../components/Camera/CameraDetail";

interface CameraType {
  id: string | number;
  name: string;
  location: string;
  status: string;
  thumbnail: string;
  description?: string;
}

export default function CameraDashboard() {
  const [selectedCamera, setSelectedCamera] = useState<CameraType | null>(null);
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    // Fetch camera data from backend
    setLoading(true);
    fetch("http://localhost:8000/api/cameras")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch camera data");
        }
        return res.json();
      })
      .then((data) => {
        const sortedData = data.sort((a: CameraType, b: CameraType) => 
          typeof a.id === 'number' && typeof b.id === 'number' ? a.id - b.id : String(a.id).localeCompare(String(b.id))
        );

        console.log("Fetched cameras:", sortedData);
        setCameras(sortedData);

        // Select first camera if none is selected
        if (!selectedCamera && sortedData.length > 0) {
          setSelectedCamera(sortedData[0]);
        }
        
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading cameras:", err);
        setError("Failed to load cameras. Please try again later.");
        setLoading(false);
      });
  }, []);

  const handleCameraClick = (camera: CameraType) => {
    setSelectedCamera(camera);
  };

  const filteredCameras = cameras.filter(camera => {
    if (filter === "all") return true;
    if (filter === "violation") return camera.status === "violation";
    if (filter === "normal") return camera.status !== "violation";
    return true;
  });

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Camera Surveillance Dashboard" />

        <div className="flex p-4 gap-6 flex-grow overflow-hidden">
          {loading ? (
            <div className="w-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="w-full text-center text-red-600 bg-red-50 p-4 rounded-lg">
              {error}
            </div>
          ) : (
            <>
              <div className="w-3/5 overflow-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                  {filteredCameras.map((camera) => (
                    <div key={camera.id} className="transition-transform hover:translate-y-[-5px]">
                      <CameraCard
                        camera={camera}
                        isSelected={selectedCamera ? selectedCamera.id === camera.id : false}
                        onClick={handleCameraClick}
                      />
                    </div>
                  ))}
                  
                  {filteredCameras.length === 0 && (
                    <div className="col-span-3 py-12 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      No cameras match your current filter.
                    </div>
                  )}
                </div>
              </div>

              <div className="w-2/5">
                <CameraDetail camera={selectedCamera} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}