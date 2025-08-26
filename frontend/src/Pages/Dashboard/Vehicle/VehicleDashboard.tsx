import { useEffect, useState } from "react";
import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";
import TableVehicle from "../../../components/Vehicle/TableVehicle";
import { API_URL_BE } from "../../../components/Link/LinkAPI";

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
  const [vehicles, setVehicles] = useState<VehicleType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey] = useState(0);

  useEffect(() => {
    const fetchVehicles = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL_BE}api/vehicle`, {
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const data = await response.json();
        console.log("Fetched vehicles:", data); // Debug log
        setVehicles(data || []);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        setVehicles([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVehicles();
  }, [refreshKey]);

  return (
    <div className="flex h-screen">
      <Sidebar defaultActiveItem="vehicles" />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Vehicle Dashboard" />
        <div className="flex-grow overflow-y-auto p-4">
          <div className="max-w-full space-y-8">
            <TableVehicle
              key={refreshKey}
              vehicles={vehicles}
              setVehicles={setVehicles}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}