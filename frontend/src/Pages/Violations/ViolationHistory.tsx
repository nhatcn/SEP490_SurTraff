import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import Header from "../../components/Layout/Header";
import axios from "axios";
import { format } from "date-fns";

interface ViolationType {
  id: number;
  typeName: string;
}

interface Violation {
  id: number;
  licensePlate: string;
  violationType: ViolationType | null;
  violationTime: string | null;
}

export default function ViolationHistory() {
  const { plate } = useParams();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8081";

  useEffect(() => {
    if (!plate) return;

    axios
      .get(`${API_URL}/api/violations/history/${plate}`)
      .then((res) => {
        setViolations(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Không thể tải lịch sử vi phạm.");
        setLoading(false);
      });
  }, [plate]);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title={`Lịch sử vi phạm - ${plate}`} />
        <div className="flex-grow p-4 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin h-10 w-10 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 bg-red-100 p-4 rounded-md">
              {error}
            </div>
          ) : violations.length === 0 ? (
            <div className="text-gray-500 text-center">Không có vi phạm nào được ghi nhận cho biển số này.</div>
          ) : (
            <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3">ID</th>
                  <th className="text-left p-3">Loại vi phạm</th>
                  <th className="text-left p-3">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {violations.map((violation) => (
                  <tr key={violation.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">#{violation.id}</td>
                    <td className="p-3">{violation.violationType?.typeName || "N/A"}</td>
                    <td className="p-3">
                      {violation.violationTime
                        ? format(new Date(violation.violationTime), "dd/MM/yyyy HH:mm:ss")
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
