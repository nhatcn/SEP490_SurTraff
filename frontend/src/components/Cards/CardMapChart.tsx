import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LatLngBoundsExpression } from "leaflet";

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

interface CardMapChartProps {
  accidents: Accident[];
}

const VIETNAM_BOUNDS: LatLngBoundsExpression = [
  [8.18, 102.14],
  [23.39, 109.46],
];

const getColor = (count: number, max: number) => {
  if (count === 0) return "#e0e0e0";
  const alpha = 0.3 + 0.7 * (count / max);
  return `rgba(220,38,38,${alpha})`;
};

const VietnamAccidentMap: React.FC<{
  accidents: Accident[];
  accidentCountByProvince: Record<string, number>;
  maxCount: number;
}> = ({ accidentCountByProvince, maxCount }) => {
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    fetch("/gadm41_VNM_1.json")
      .then((res) => res.json())
      .then((data) => setGeoData(data));
  }, []);

  const style = (feature: any) => {
    const provinceName =
      feature.properties?.NAME_1?.trim() ||
      feature.properties?.VARNAME_1?.split("|")[0]?.trim();
    const count = accidentCountByProvince[provinceName] || 0;
    return {
      fillColor: getColor(count, maxCount),
      weight: 1.5,
      color: "#1976d2",
      fillOpacity: 0.7,
    };
  };

  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px #0001" }}>
      <MapContainer
        bounds={VIETNAM_BOUNDS}
        zoom={7}
        style={{ width: "100%", height: "100%" }}
        maxBounds={VIETNAM_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={7}
        maxZoom={10}
        scrollWheelZoom={true}
        doubleClickZoom={false}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoData && (
          <GeoJSON data={geoData} style={style} />
        )}
      </MapContainer>
    </div>
  );
};

const CardMapChart: React.FC<CardMapChartProps> = ({ accidents }) => {
  const accidentCountByProvince = useMemo(() => {
    const count: Record<string, number> = {};
    accidents.forEach((a) => {
      const province = a.location?.trim();
      if (province) count[province] = (count[province] || 0) + 1;
    });
    return count;
  }, [accidents]);

  const totalValidAccidents = useMemo(() =>
    Object.values(accidentCountByProvince).reduce((a, b) => a + b, 0)
  , [accidentCountByProvince]);

  const maxCount = useMemo(() => {
    return Math.max(1, ...Object.values(accidentCountByProvince));
  }, [accidentCountByProvince]);

  const sortedProvinces = useMemo(() => {
    return Object.entries(accidentCountByProvince)
      .sort((a, b) => b[1] - a[1]);
  }, [accidentCountByProvince]);

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded p-8">
      <div className="flex flex-row gap-8 items-start w-full">
        {/* Bên trái: List */}
        <div className="flex flex-col flex-1 min-w-0">
          <h6 className="uppercase text-blueGray-400 mb-1 text-xs font-semibold">
            Statistics
          </h6>
          <h2 className="text-blueGray-700 text-xl font-semibold">
            Accidents by Zone
          </h2>
          <div
            style={{
              maxHeight: 420,
              overflowY: "auto",
              marginBottom: 8,
            }}
          >
            {/* Divider trên cùng */}
            <div style={{ borderBottom: "1px solid #eee" }} />
            {sortedProvinces.length === 0 && (
              <div style={{ color: "#888", fontSize: 18 }}>Không có dữ liệu</div>
            )}
            {sortedProvinces.map(([province, count], idx) => (
              <div
                key={province}
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: 20,
                  padding: "14px 0",
                  fontWeight: 600,
                  borderBottom: idx !== sortedProvinces.length - 1 ? "1px solid #eee" : "none",
                }}
              >
                <span style={{
                  color: "#888",
                  minWidth: 36,
                  textAlign: "right",
                  marginRight: 32,
                  fontSize: 20,
                  flexShrink: 0,
                  fontWeight: 600,
                  letterSpacing: 1,
                }}>
                  {idx + 1}.
                </span>
                <span style={{
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 1,
                  fontSize: 20,
                  marginRight: 0,
                }}>
                  {province}
                </span>
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  marginLeft: 32,
                  gap: 40,
                  flexShrink: 0,
                }}>
                  <span style={{
                    color: "#dc2626",
                    fontWeight: 700,
                    minWidth: 36,
                    textAlign: "right",
                    fontSize: 20,
                  }}>
                    {count}
                  </span>
                  <span style={{
                    fontSize: 18,
                    color: "#888",
                    minWidth: 44,
                    textAlign: "right",
                    fontWeight: 500,
                  }}>
                    {totalValidAccidents > 0
                      ? ((count / totalValidAccidents) * 100).toFixed(1) + "%"
                      : "0%"}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "right", fontSize: 18, color: "#666", fontWeight: 500 }}>
            Tổng số tai nạn:{" "}
            <span style={{ fontWeight: 700, color: "#dc2626", fontSize: 20 }}>
              {totalValidAccidents}
            </span>
          </div>
        </div>
        {/* Bên phải: Map */}
        <div className="flex-1 min-w-0" style={{ height: 500, overflow: "hidden" }}>
          <VietnamAccidentMap
            accidents={accidents}
            accidentCountByProvince={accidentCountByProvince}
            maxCount={maxCount}
          />
        </div>
      </div>
    </div>
  );
};

export default CardMapChart;