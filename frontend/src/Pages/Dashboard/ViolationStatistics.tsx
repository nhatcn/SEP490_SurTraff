import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import Header from "../../components/Layout/Header";
import CardLineChartViolations from "../../components/Cards/CardLineChartViolations";
import CardBarChartViolations from "../../components/Cards/CardBarChartViolations";
import CardLineChartViolations2 from "../../components/Cards/CardLineChartViolations2";
import CardBarChartViolations2 from "../../components/Cards/CardBarChartViolations2";

interface Violation {
  id: number;
  createdAt: string;
  vehicleId: number | null;
}

const ViolationStatistics: React.FC = () => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const response = await fetch("http://localhost:8081/api/violations/all");
        const data = await response.json();
        setViolations(data);
      } catch (error) {
        console.error("Error fetching violations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchViolations();
  }, []);

  // Thêm class h-96 (hoặc h-[450px]) cho các chart
  const chartContainerClass = "relative h-96"; // hoặc "relative h-[450px]"

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Violation Statistics Dashboard" />
        <div className="p-4">
          <div className="flex flex-wrap">
            <div className="w-full xl:w-7/12 mb-12 xl:mb-0 px-4">
              <div className={chartContainerClass}>
                <CardLineChartViolations violations={violations} />
              </div>
            </div>
            <div className="w-full xl:w-5/12 px-4">
              <div className={chartContainerClass}>
                <CardBarChartViolations violations={violations} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap">
            <div className="w-full xl:w-8/12 mb-12 xl:mb-0 px-4">
              <div className={chartContainerClass}>
                <CardLineChartViolations2 violations={violations} />
              </div>
            </div>
            <div className="w-full xl:w-4/12 px-4">
              <div className={chartContainerClass}>
                <CardBarChartViolations2 violations={violations} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViolationStatistics;