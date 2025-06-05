import React, { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

function getTopVehicleViolations(violations, topN = 5) {
  const stats = {};
  violations.forEach(vio => {
    if (vio.vehicle_id == null) return;
    stats[vio.vehicle_id] = (stats[vio.vehicle_id] || 0) + 1;
  });
  // Chuyển thành mảng, sort giảm dần theo count, lấy topN
  return Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

export default function CardBarChartViolations2({ violations }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const stats = getTopVehicleViolations(violations, 5); // Top 5
    const labels = stats.map(([vehicle_id]) => `Vehicle ${vehicle_id}`);
    const data = stats.map(([, count]) => count);

    const config = {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Top 5 Vehicles by Violations",
            backgroundColor: "#ed64a6",
            borderColor: "#ed64a6",
            data,
            fill: false,
            barThickness: 24,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: "Top 5 Vehicles by Violation Count",
          },
          tooltip: { mode: "index", intersect: false },
        },
        hover: { mode: "nearest", intersect: true },
        scales: {
          x: {
            display: true,
            title: { display: true, text: "Vehicle ID" },
            grid: { borderDash: [2], color: "rgba(33, 37, 41, 0.3)" },
          },
          y: {
            display: true,
            title: { display: true, text: "Violation Count" },
            grid: { borderDash: [2], drawBorder: false, color: "rgba(33, 37, 41, 0.2)" },
            beginAtZero: true,
            ticks: { precision: 0 },
          },
        },
      },
    };

    const ctx = chartRef.current.getContext("2d");
    chartInstanceRef.current = new Chart(ctx, config);

    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
    };
  }, [violations]);

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
      <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
        <div className="flex flex-wrap items-center justify-between">
          <div>
            <h6 className="uppercase text-blueGray-400 mb-1 text-xs font-semibold">
              Statistics
            </h6>
            <h2 className="text-blueGray-700 text-xl font-semibold">
              Top 5 Vehicles by Violation Count
            </h2>
          </div>
        </div>
      </div>
      <div className="p-4 flex-auto">
        <div className="relative h-350-px">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    </div>
  );
}