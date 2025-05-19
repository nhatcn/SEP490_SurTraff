import { useState, useEffect } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import Header from "../../components/Layout/Header";

import TableUser from "../../components/User/TableUser";


export default function UserDashboard() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Camera Surveillance Dashboard" />
        
        
        <div className="flex-grow overflow-y-auto p-4">
          <TableUser />
        </div>
      </div>
    </div>
  );
}
