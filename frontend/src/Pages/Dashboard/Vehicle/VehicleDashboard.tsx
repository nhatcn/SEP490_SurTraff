import { useEffect, useState } from "react";
import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";
import { Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TableVehicle from "../../../components/Vehicle/TableVehicle";

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
  return (
    <div className="flex h-screen">
      <Sidebar defaultActiveItem="vehicle"/>
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Vehicle Dashboard" />
        
        
        <div className="flex-grow overflow-y-auto p-4">
          <TableVehicle />
        </div>
      </div>
    </div>
  );
}