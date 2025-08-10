"use client"

import type React from "react"
import { useEffect, useState, useMemo } from "react"
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import type { LatLngBoundsExpression } from "leaflet"

interface Camera {
  id: number
  name: string
  location: string
}

interface Accident {
  id: number
  camera: Camera
  imageUrl: string
  description: string
  videoUrl: string
  location: string
  accidentTime: string
  createdAt: string
}

interface CardMapChartProps {
  accidents: Accident[]
}

const VIETNAM_BOUNDS: LatLngBoundsExpression = [
  [8.18, 102.14],
  [23.39, 109.46],
]

const getColor = (count: number, max: number) => {
  if (count === 0) return "#e5e7eb"

  const percentage = count / max

  if (percentage <= 0.25) return "#fca5a5" // Light red (0-25%)
  if (percentage <= 0.5) return "#f87171" // Medium light red (25-50%)
  if (percentage <= 0.75) return "#ef4444" // Medium red (50-75%)
  return "#dc2626" // Dark red (75-100%)
}

const MapLegend: React.FC = () => {
  const legendItems = [
    { color: "#e5e7eb", label: "No accidents", range: "0" },
    { color: "#fca5a5", label: "Low", range: "1-25%" },
    { color: "#f87171", label: "Medium-Low", range: "26-50%" },
    { color: "#ef4444", label: "Medium-High", range: "51-75%" },
    { color: "#dc2626", label: "High", range: "76-100%" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        left: "20px",
        backgroundColor: "white",
        padding: "12px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        zIndex: 1000,
        fontSize: "12px",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "13px" }}>Accident Level</div>
      {legendItems.map((item, index) => (
        <div key={index} style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
          <div
            style={{
              width: "16px",
              height: "16px",
              backgroundColor: item.color,
              border: "1px solid #ccc",
              marginRight: "8px",
              borderRadius: "2px",
            }}
          />
          <span style={{ marginRight: "8px", minWidth: "80px" }}>{item.label}</span>
          <span style={{ color: "#666", fontSize: "11px" }}>({item.range})</span>
        </div>
      ))}
    </div>
  )
}

const VietnamAccidentMap: React.FC<{
  accidents: Accident[]
  accidentCountByProvince: Record<string, number>
  maxCount: number
}> = ({ accidentCountByProvince, maxCount }) => {
  const [geoData, setGeoData] = useState<any>(null)

  useEffect(() => {
    fetch("/gadm41_VNM_1.json")
      .then((res) => res.json())
      .then((data) => setGeoData(data))
  }, [])

  const style = (feature: any) => {
    const provinceName = feature.properties?.NAME_1?.trim() || feature.properties?.VARNAME_1?.split("|")[0]?.trim()
    const count = accidentCountByProvince[provinceName] || 0
    return {
      fillColor: getColor(count, maxCount),
      weight: 1.5,
      color: "#1976d2",
      fillOpacity: 0.8,
    }
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        position: "relative",
      }}
    >
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
        {geoData && <GeoJSON data={geoData} style={style} />}
      </MapContainer>
      <MapLegend />
    </div>
  )
}

const CardMapChart: React.FC<CardMapChartProps> = ({ accidents }) => {
  const accidentCountByProvince = useMemo(() => {
    const count: Record<string, number> = {}
    accidents.forEach((a) => {
      const province = a.location?.trim()
      if (province) count[province] = (count[province] || 0) + 1
    })
    return count
  }, [accidents])

  const totalValidAccidents = useMemo(
    () => Object.values(accidentCountByProvince).reduce((a, b) => a + b, 0),
    [accidentCountByProvince],
  )

  const maxCount = useMemo(() => {
    return Math.max(1, ...Object.values(accidentCountByProvince))
  }, [accidentCountByProvince])

  const sortedProvinces = useMemo(() => {
    return Object.entries(accidentCountByProvince).sort((a, b) => b[1] - a[1])
  }, [accidentCountByProvince])

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded p-8">
      <div className="flex flex-row gap-8 items-start w-full">
        {/* Bên trái: List - 40% */}
        <div className="min-w-0" style={{ width: "40%" }}>
          <h6 className="uppercase text-blueGray-400 mb-1 text-xs font-semibold">Statistics</h6>
          <h2 className="text-blueGray-700 text-xl font-semibold">Accidents by Zone</h2>
          <div
            style={{
              maxHeight: 420,
              overflowY: "auto",
              marginBottom: 8,
            }}
          >
            {/* Divider trên cùng */}
            <div style={{ borderBottom: "1px solid #eee" }} />
            {sortedProvinces.length === 0 && <div style={{ color: "#888", fontSize: 18 }}>Không có dữ liệu</div>}
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
                <span
                  style={{
                    color: "#888",
                    minWidth: 36,
                    textAlign: "right",
                    marginRight: 32,
                    fontSize: 20,
                    flexShrink: 0,
                    fontWeight: 600,
                    letterSpacing: 1,
                  }}
                >
                  {idx + 1}.
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    flex: 1,
                    fontSize: 20,
                    marginRight: 0,
                  }}
                >
                  {province}
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginLeft: 32,
                    gap: 40,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      color: "#dc2626",
                      fontWeight: 700,
                      minWidth: 36,
                      textAlign: "right",
                      fontSize: 20,
                    }}
                  >
                    {count}
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      color: "#888",
                      minWidth: 44,
                      textAlign: "right",
                      fontWeight: 500,
                    }}
                  >
                    {totalValidAccidents > 0 ? ((count / totalValidAccidents) * 100).toFixed(1) + "%" : "0%"}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "right", fontSize: 18, color: "#666", fontWeight: 500 }}>
            Total accidents:{" "}
            <span style={{ fontWeight: 700, color: "#dc2626", fontSize: 20 }}>{totalValidAccidents}</span>
          </div>
        </div>

        {/* Bên phải: Map - 60% */}
        <div className="min-w-0" style={{ width: "60%", height: 500, overflow: "hidden" }}>
          <VietnamAccidentMap
            accidents={accidents}
            accidentCountByProvince={accidentCountByProvince}
            maxCount={maxCount}
          />
        </div>
      </div>
    </div>
  )
}

export default CardMapChart
