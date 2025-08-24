import { useState, useEffect } from "react";
import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";
import AccidentDetailsTable from "../../../components/Accidents/AccidentDetailsTable";
import BounceLoadingComponent from "../../../components/Layout/Loading";

export default function AccidentDetails() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Giả lập gọi API
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500); // ví dụ delay 1.5s
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar luôn hiển thị */}
      <Sidebar defaultActiveItem="accidents" />

      {/* Vùng nội dung */}
      <div className="flex flex-col flex-grow">
        <Header title="Accident Detail" />

        <div className="relative p-6 overflow-y-auto flex-grow">
          {loading && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/70">
              <BounceLoadingComponent fullScreen={false}  size="sm"/>
            </div>
          )}

          {!loading && <AccidentDetailsTable />}
        </div>
      </div>
    </div>
  );
}
