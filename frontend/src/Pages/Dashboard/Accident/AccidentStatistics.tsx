import React, { useEffect, useState } from "react";
import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";

import CardLineChart from "../../../components/Cards/CardLineChart";
import CardBarChart from "../../../components/Cards/CardBarChart";
import CardLineChart2 from "../../../components/Cards/CardLineChart2";

interface Camera {
  id: number;
  name: string;
  location: string;
}

interface Accident {
  id: number;
  camera: Camera;
  imageUrl: string;
  description: string;
  videoUrl: string;
  location: string;
  accidentTime: string;
  createdAt: string;
}

const AccidentStatistics: React.FC = () => {
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:8081/api/accidents/all")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch accident data");
        return res.json();
      })
      .then((data) => {
        setAccidents(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load accident data. Please try again later.");
        setLoading(false);
      });
  }, []);

  const chartContainerClass = "relative h-96 mb-6";

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header title="Accident Statistics Dashboard" />
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 min-h-full">
            {/* First Row */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
              <div className="xl:col-span-8">
                <div className={chartContainerClass}>
                  <CardLineChart accidents={accidents} />
                </div>
              </div>
              <div className="xl:col-span-4">
                <div className={chartContainerClass}>
                  <CardBarChart accidents={accidents} />
                </div>
              </div>
            </div>

            {/* Second Row - Full Width */}
            <div className="w-full">
              <div className={chartContainerClass}>
                <CardLineChart2 accidents={accidents} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccidentStatistics;
