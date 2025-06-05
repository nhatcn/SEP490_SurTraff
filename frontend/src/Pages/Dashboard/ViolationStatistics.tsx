import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import Header from "../../components/Layout/Header";
import CardLineChartViolations from "../../components/Cards/CardLineChartViolations";
import CardBarChartViolations from "../../components/Cards/CardBarChartViolations";
import CardLineChartViolations2 from "../../components/Cards/CardLineChartViolations2";
import CardBarChartViolations2 from "../../components/Cards/CardBarChartViolations2";

interface Violation {
  id: number;
  camera_id: number;
  vehicle_type_id: number;
  created_at: string;
  vehicle_id: number | null;
  // Thêm trường khác nếu muốn
}

const mockViolations: Violation[] = [
  {
    id: 1,
    camera_id: 1,
    vehicle_type_id: 1,
    created_at: "2024-06-01T08:30:00",
    vehicle_id: 101,
  },
  {
    id: 2,
    camera_id: 2,
    vehicle_type_id: 2,
    created_at: "2024-06-02T09:15:00",
    vehicle_id: 101,
  },
  {
    id: 3,
    camera_id: 1,
    vehicle_type_id: 1,
    created_at: "2024-06-03T10:00:00",
    vehicle_id: 103,
  },
  {
    id: 4,
    camera_id: 3,
    vehicle_type_id: 3,
    created_at: "2024-06-04T11:45:00",
    vehicle_id: 104,
  },
  {
    id: 5,
    camera_id: 2,
    vehicle_type_id: 2,
    created_at: "2024-06-05T12:30:00",
    vehicle_id: 105,
  },
  {
    id: 6,
    camera_id: 1,
    vehicle_type_id: 1,
    created_at: "2024-06-06T14:00:00",
    vehicle_id: 106,
  },
  {
    id: 7,
    camera_id: 2,
    vehicle_type_id: 2,
    created_at: "2024-06-07T15:30:00",
    vehicle_id: 107,
  },
];

const ViolationStatistics: React.FC = () => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setViolations(mockViolations);
    setLoading(false);
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Violation Statistics Dashboard" />
        <div className="p-4">
          <div className="flex flex-wrap">
            <div className="w-full xl:w-7/12 mb-12 xl:mb-0 px-4">
              <CardLineChartViolations violations={violations} />
            </div>
            <div className="w-full xl:w-5/12 px-4">
              <CardBarChartViolations violations={violations} />
            </div>
          </div>
          <div className="flex flex-wrap">
            <div className="w-full xl:w-8/12 mb-12 xl:mb-0 px-4">
              <CardLineChartViolations2 violations={violations} />
            </div>
            <div className="w-full xl:w-4/12 px-4">
              <CardBarChartViolations2 violations={violations} />
            </div>
          </div>
          <div className="w-full max-w-6xl mx-auto mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-blue-700">Violation Statistics Table</h2>
            {loading ? (
              <div className="text-center text-blue-500">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 border-b text-left">ID</th>
                      <th className="px-4 py-2 border-b text-left">Camera ID</th>
                      <th className="px-4 py-2 border-b text-left">Vehicle Type ID</th>
                      <th className="px-4 py-2 border-b text-left">Created At</th>
                      <th className="px-4 py-2 border-b text-left">Vehicle ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {violations.map((violation) => (
                      <tr key={violation.id} className="hover:bg-blue-50 transition">
                        <td className="px-4 py-2 border-b">{violation.id}</td>
                        <td className="px-4 py-2 border-b">{violation.camera_id}</td>
                        <td className="px-4 py-2 border-b">{violation.vehicle_type_id}</td>
                        <td className="px-4 py-2 border-b">{violation.created_at}</td>
                        <td className="px-4 py-2 border-b">{violation.vehicle_id}</td>
                      </tr>
                    ))}
                    {violations.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-400">
                          No violation data found.
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

export default ViolationStatistics;