import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../../components/Layout/Sidebar";
import Header from "../../components/Layout/Header";
import API_URL_BE from "../../components/Link/LinkAPI";

interface ViolationType {
  id: number;
  name: string;
}

interface Violation {
  id: number;
  violationType: ViolationType;
  licensePlate: string;
  violationTime: string;
}

export default function EditViolation() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [violation, setViolation] = useState<Violation | null>(null);
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchViolation();
    fetchViolationTypes();
  }, []);

  const fetchViolation = async () => {
    try {
      const res = await axios.get(API_URL_BE+`api/violations/${id}`);
      setViolation(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Không thể tải dữ liệu vi phạm.");
      setLoading(false);
    }
  };

  const fetchViolationTypes = async () => {
    try {
      const res = await axios.get(API_URL_BE+"api/violation-types");
      setViolationTypes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    try {
      await axios.put(`API_URL_BEapi/violations/${id}`, {
        violationTypeId: violation?.violationType.id,
        licensePlate: violation?.licensePlate,
        violationTime: violation?.violationTime,
      });
      alert("Cập nhật thành công!");
      navigate("/violations");
    } catch (err) {
      console.error(err);
      alert("Cập nhật thất bại.");
    }
  };

  const handleChange = (field: keyof Violation, value: any) => {
    setViolation((prev) =>
      prev ? { ...prev, [field]: value } : prev
    );
  };

  if (loading) return <div className="p-4">Đang tải...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!violation) return <div className="p-4">Không tìm thấy vi phạm.</div>;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Chỉnh sửa vi phạm" />
        <div className="p-6 space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Loại vi phạm</label>
            <select
              value={violation.violationType.id}
              onChange={(e) =>
                handleChange(
                  "violationType",
                  violationTypes.find((t) => t.id === Number(e.target.value)) || violation.violationType
                )
              }
              className="w-full p-2 border rounded"
            >
              {violationTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Biển số xe</label>
            <input
              type="text"
              value={violation.licensePlate}
              onChange={(e) => handleChange("licensePlate", e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Thời gian vi phạm</label>
            <input
              type="datetime-local"
              value={new Date(violation.violationTime).toISOString().slice(0, 16)}
              onChange={(e) => handleChange("violationTime", new Date(e.target.value).toISOString())}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex gap-4 mt-4">
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Lưu
            </button>
            <button
              onClick={() => navigate("/violations")}
              className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
