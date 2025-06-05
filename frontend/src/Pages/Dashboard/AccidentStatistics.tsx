import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import Header from "../../components/Layout/Header";

// Import các Card đã copy từ Notus React
import CardLineChart from "../../components/Cards/CardLineChart";
import CardBarChart from "../../components/Cards/CardBarChart";
import CardPageVisits from "../../components/Cards/CardPageVisits";
import CardSocialTraffic from "../../components/Cards/CardSocialTraffic";
import CardLineChart2 from "../../components/Cards/CardLineChart2";

interface Camera {
  id: number;
  name: string;
  location: string;
}

interface Accident {
  id: number;
  camera: Camera;
  image_url: string;
  description: string;
  video_url: string;
  location: string;
  accident_time: string;
  created_at: string;
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
          <div className="w-full max-w-6xl mx-auto mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-blue-700">Accident Statistics Table</h2>
            {loading ? (
              <div className="text-center text-blue-500">Loading...</div>
            ) : error ? (
              <div className="text-center text-red-500">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 border-b text-left">ID</th>
                      <th className="px-4 py-2 border-b text-left">Camera</th>
                      <th className="px-4 py-2 border-b text-left">Time</th>
                      <th className="px-4 py-2 border-b text-left">Location</th>
                      <th className="px-4 py-2 border-b text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accidents.map((accident) => (
                      <tr key={accident.id} className="hover:bg-blue-50 transition">
                        <td className="px-4 py-2 border-b">{accident.id}</td>
                        <td className="px-4 py-2 border-b">{accident.camera?.name}</td>
                        <td className="px-4 py-2 border-b">{accident.accident_time}</td>
                        <td className="px-4 py-2 border-b">{accident.location}</td>
                        <td className="px-4 py-2 border-b">{accident.description}</td>
                      </tr>
                    ))}
                    {accidents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-400">
                          No accident data found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccidentStatistics;