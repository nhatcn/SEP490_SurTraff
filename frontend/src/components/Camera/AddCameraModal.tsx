import React, { useState } from "react";

interface Zone {
  id?: string;
  type: "lane" | "line" | "light";
  polygon?: Array<[number, number]>;
  lineCoords?: Array<[number, number]>;
  name: string;
}

interface AddCameraModalProps {
  onClose: () => void;
  onAdd: (cameraData: any, zones: Zone[]) => void;
  thumbnailUrl: string;
}

export default function AddCameraModal({ onClose, onAdd, thumbnailUrl }: AddCameraModalProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [status, setStatus] = useState("active");

  // Zones state, cho phép vẽ, thêm/xóa zones
  const [zones, setZones] = useState<Zone[]>([]);

  // Hàm ví dụ thêm zone (cần hiện thực vẽ trên ảnh, hoặc dùng thư viện canvas)
  const addZone = (zone: Zone) => {
    setZones([...zones, zone]);
  };

  const handleSubmit = () => {
    const cameraData = { name, location, stream_url: streamUrl, status };
    onAdd(cameraData, zones);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg w-4/5 max-w-4xl p-6 overflow-auto max-h-[90vh]">
        <h3 className="text-2xl mb-4">Add New Camera</h3>

        <div className="mb-4">
          <label className="block mb-1">Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="Camera name"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Location</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="Location"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Stream URL</label>
          <input
            value={streamUrl}
            onChange={e => setStreamUrl(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="Stream URL"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="active">Active</option>
            <option value="violation">Violation</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-1">Thumbnail (Preview)</label>
          <img src="https://th.bing.com/th/id/OIP.qhZxpqlB1IrnkwmONFBVewHaFC?cb=iwc2&rs=1&pid=ImgDetMain" alt="Thumbnail" className="w-full max-h-64 object-contain border rounded" />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Zones (draw on thumbnail)</label>
          {/* Đây là chỗ bạn có thể tích hợp thư viện vẽ polygon/line trên ảnh như react-konva, react-svg-draw, ... */}
          <div className="border p-4 rounded text-center text-gray-500">
            {/* Ví dụ placeholder */}
            Zone drawing UI here (implement with canvas/svg)
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Camera
          </button>
        </div>
      </div>
    </div>
  );
}
