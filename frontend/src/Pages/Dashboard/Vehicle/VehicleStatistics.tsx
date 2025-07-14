import { useEffect, useState } from "react";
import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";
import { Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TableVehicleTracking from "../../../components/Vehicle/TableVehicleStatistics";

export default function VehicleTracking() {
  return (
    <div className="flex h-screen">
      <Sidebar defaultActiveItem="vehicle"/>
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Vehicle Statistics Dashboard" />
        
        
        <div className="flex-grow overflow-y-auto p-4">
          <TableVehicleTracking />
        </div>
      </div>
    </div>
  );
}