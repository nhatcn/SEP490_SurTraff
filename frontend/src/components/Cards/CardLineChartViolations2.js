import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

// Chuyển ngày về ISO nếu cần
function toISODateString(dateStr) {
  return dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
}

// Hàm lấy số liệu theo tháng cho từng năm, có filter from/to
function getMonthlyStats(violations, year, fromDate, toDate) {
  const months = Array(12).fill(0);
  violations.forEach(vio => {
    if (!vio.createdAt) return;
    const date = new Date(toISODateString(vio.createdAt));
    if (
      !isNaN(date) &&
      date.getFullYear() === year &&
      (!fromDate || date >= fromDate) &&
      (!toDate || date <= toDate)
    ) {
      months[date.getMonth()]++;
    }
  });
  return months;
}

const COLORS = [
  "#4c51bf", "#ed64a6", "#38b2ac", "#ecc94b", "#f56565", "#4299e1", "#48bb78"
];

export default function CardLineChartViolations2({ violations }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    const yearsSet = new Set();
    violations.forEach(vio => {
      if (!vio.createdAt) return;
      const date = new Date(toISODateString(vio.createdAt));
      if (
        !isNaN(date) &&
        (!fromDate || date >= fromDate) &&
        (!toDate || date <= toDate)
      ) {
        yearsSet.add(date.getFullYear());
      }
    });
    const years = Array.from(yearsSet).sort();

    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const datasets = years.map((year, idx) => ({
      label: year,
      backgroundColor: COLORS[idx % COLORS.length],
      borderColor: COLORS[idx % COLORS.length],
      data: getMonthlyStats(violations, year, fromDate, toDate),
      fill: false,
      tension: 0.3,
    }));

    // Debug log
    // console.log("Years:", years);
    // console.log("Datasets:", datasets);

    const config = {
      type: "line",
      data: {
        labels: months,
        datasets: datasets,
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: "rgba(255,255,255,.7)",
            },
            align: "end",
            position: "bottom",
          },
          title: {
            display: false,
            text: "Violations by Year",
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        hover: {
          mode: "nearest",
          intersect: true,
        },
        scales: {
          x: {
            ticks: {
              color: "rgba(255,255,255,.7)",
            },
            title: {
              display: false,
              text: "Month",
              color: "white",
            },
            grid: {
              display: false,
              borderDash: [2],
              color: "rgba(33, 37, 41, 0.3)",
              zeroLineColor: "rgba(0, 0, 0, 0)",
              zeroLineBorderDash: [2],
            },
          },
          y: {
            ticks: {
              color: "rgba(255,255,255,.7)",
            },
            title: {
              display: false,
              text: "Value",
              color: "white",
            },
            grid: {
              borderDash: [3],
              drawBorder: false,
              color: "rgba(255, 255, 255, 0.15)",
              zeroLineColor: "rgba(33, 37, 41, 0)",
              zeroLineBorderDash: [2],
            },
          },
        },
      },
    };

    const ctx = chartRef.current.getContext("2d");
    chartInstanceRef.current = new Chart(ctx, config);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [violations, from, to]);

  return (
    <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-blueGray-700">
      <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
        <div className="flex flex-wrap items-center justify-between">
          <div>
            <h6 className="uppercase text-blueGray-400 mb-1 text-xs font-semibold">
              Statistics
            </h6>
            <h2 className="text-blueGray-700 text-xl font-semibold">
              Violations by Year
            </h2>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs">From</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            />
            <label className="text-xs">To</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            />
          </div>
        </div>
      </div>
      <div className="p-4 flex-auto">
        <div className="relative h-[200px]">
          <canvas ref={chartRef} className="w-full h-full"></canvas>
        </div>
      </div>
    </div>
  );
}