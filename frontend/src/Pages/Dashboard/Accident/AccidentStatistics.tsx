import React, { useEffect, useState } from "react";
import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";

// Import các Card đã copy từ Notus React
import CardLineChart from "../../../components/Cards/CardLineChart";
import CardBarChart from "../../../components/Cards/CardBarChart";
import CardPageVisits from "../../../components/Cards/CardPageVisits";
import CardSocialTraffic from "../../../components/Cards/CardSocialTraffic";
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

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Accident Statistics Dashboard" />
        <div className="p-4">
          {/* Dashboard 4 card như Notus React */}
          <div className="flex flex-wrap">
            <div className="w-full xl:w-8/12 mb-12 xl:mb-0 px-4">
              <CardLineChart accidents={accidents} />
            </div>
            <div className="w-full xl:w-4/12 px-4">
              <CardBarChart accidents={accidents} />
            </div>
          </div>
          {/*<div className="flex flex-wrap mt-4">
            <div className="w-full xl:w-8/12 mb-12 xl:mb-0 px-4">
              <CardPageVisits />
            </div>
            <div className="w-full xl:w-4/12 px-4">
              <CardSocialTraffic />
            </div>
          </div>*/}
          {/* Bảng thống kê accident */}
          <div className="w-full px-4">
              <CardLineChart2 accidents={accidents} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccidentStatistics;