import { useEffect, useState } from "react";
import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";
import { Eye, Trash2, Car } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TableVehicle from "../../../components/Vehicle/TableVehicle";
import AddVehicle from "./AddVehicle";
import API_URL_BE from "../../../components/Link/LinkAPI";

interface VehicleType {
  id: number;
  name: string;
  licensePlate: string;
  userId: number;
  vehicleTypeId: number;
  color: string;
  brand: string;
}

export default function VehicleDashboard() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleType[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch vehicles on mount and when refreshKey changes
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch(API_URL_BE +'api/vehicle', {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const data = await response.json();
        setVehicles(data);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };
    fetchVehicles();
  }, [refreshKey]);

  // Callback for when a new vehicle is added
const handleVehicleAdded = (newVehicle: VehicleType) => {
  setRefreshKey(prev => prev + 1);
  navigate(`/vehicle/edit/${newVehicle.id}`);
};

  return (
    <div className="flex h-screen">
      <Sidebar defaultActiveItem="vehicles" />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Vehicle Dashboard" />
        <div className="flex-grow overflow-y-auto p-4">
          {/* <div className="mb-4">
            <AddVehicle onVehicleAdded={handleVehicleAdded} />
          </div> */}
          <TableVehicle key={refreshKey} />
        </div>
      </div>
    </div>
  );
}
