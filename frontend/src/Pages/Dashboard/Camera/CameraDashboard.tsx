import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";
import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";
import CameraCard from "../../../components/Camera/CameraCard";
import CameraDetail from "../../../components/Camera/CameraDetail";
import { Link } from "react-router-dom";
import AddButton from "../../../components/Button/AddButton";

interface CameraType {
  id: string | number;
  name: string;
  location: string;
  status: string;
  thumbnail: string;
  description?: string;
}

interface FilterState {
  status: string;
  location: string;
  name: string;
}

export default function CameraDashboard() {
  const [selectedCamera, setSelectedCamera] = useState<CameraType | null>(null);
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    status: "",
    location: "",
    name: ""
  });

 

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

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      status: "",
      location: "",
      name: ""
    });
  };

  const filteredCameras = cameras.filter(camera => {
    // Status filter
    if (filters.status === "violation" && camera.status !== "violation") return false;
    if (filters.status === "normal" && camera.status === "violation") return false;
    if (filters.status === "active" && camera.status !== "active") return false;
    if (filters.status === "inactive" && camera.status !== "inactive") return false;

    // Location filter
    if (filters.location && !camera.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }

    // Name filter
    if (filters.name && !camera.name.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }

    return true;
  });

  return (
    <div className="flex h-screen">
      <Sidebar defaultActiveItem="cameras" />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Camera Surveillance Dashboard" />

        {/* Filter Section - Updated to match User style */}
        <div className="p-4 bg-white border-b border-gray-200">
          {/* Filter Section */}
          <div className="flex flex-wrap mb-6 gap-2">
            {/* Add Camera Button */}
            <Link to="/addcamera" className="inline-flex">
              <AddButton
                size="md"
                variant="full"
                className="bg-blue-600 text-white hover:bg-blue-700"
                text="Add Camera"
              />
            </Link>
            <div className="border rounded-lg p-2 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
              <Filter size={20} className="text-gray-600" />
            </div>

            {/* Camera Name Search Filter */}
            <div className="border rounded-lg bg-gray-50 hover:bg-gray-100 flex-grow max-w-xs">
              <div className="flex items-center px-4 py-2">
                <input
                  type="text"
                  placeholder="Search cameras..."
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                  className="bg-transparent outline-none text-gray-700 placeholder-gray-500 w-full"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="border rounded-lg bg-gray-50 hover:bg-gray-100 flex-grow max-w-xs">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 bg-transparent outline-none text-gray-700"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="violation">Violation</option>
                <option value="normal">Normal</option>
              </select>
            </div>

            {/* Location Filter */}
            <div className="border rounded-lg bg-gray-50 hover:bg-gray-100 flex-grow max-w-xs">
              <div className="flex items-center px-4 py-2">
                <input
                  type="text"
                  placeholder="Search location..."
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="bg-transparent outline-none text-gray-700 placeholder-gray-500 w-full"
                />
              </div>
            </div>

            {/* Reset Filters Button */}
            {(filters.status || filters.location || filters.name) && (
              <button
                className="flex items-center text-red-500 hover:text-red-600 px-3 py-2 transition-colors"
                onClick={resetFilters}
              >
                <X size={16} className="mr-1" />
                Reset Filters
              </button>
            )}
          </div>

          {/* Active Filters Display */}
          {(filters.status || filters.location || filters.name) && (
            <div className="mb-4 flex flex-wrap gap-2">
              {filters.name && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  Search: {filters.name}
                  <button
                    onClick={() => handleFilterChange('name', '')}
                    className="ml-2 hover:text-blue-600"
                  >
                    <X size={14} />
                  </button>
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  Status: {filters.status}
                  <button
                    onClick={() => handleFilterChange('status', '')}
                    className="ml-2 hover:text-green-600"
                  >
                    <X size={14} />
                  </button>
                </span>
              )}
              {filters.location && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                  Location: {filters.location}
                  <button
                    onClick={() => handleFilterChange('location', '')}
                    className="ml-2 hover:text-purple-600"
                  >
                    <X size={14} />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Filter Summary */}
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{filteredCameras.length}</span> of <span className="font-medium">{cameras.length}</span> cameras
          </div>
        </div>

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
                      {cameras.length === 0
                        ? "No cameras available."
                        : "No cameras match your current filters."
                      }
                      {(filters.status || filters.location || filters.name) && (
                        <button
                          onClick={resetFilters}
                          className="mt-2 text-blue-600 hover:text-blue-800 underline"
                        >
                          Clear all filters
                        </button>
                      )}
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
