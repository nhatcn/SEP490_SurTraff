import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

function getMonthlyStats(accidents, year, fromDate, toDate) {
  const months = Array(12).fill(0);
  accidents.forEach(acc => {
    const date = new Date(acc.accidentTime); // Sửa ở đây
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

export default function CardBarChart({ accidents }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // State cho khoảng ngày
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    // Parse date từ input
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    const dataCurrent = getMonthlyStats(accidents, currentYear, fromDate, toDate);
    const dataLast = getMonthlyStats(accidents, lastYear, fromDate, toDate);

    const config = {
      type: "bar",
      data: {
        labels: months,
        datasets: [
          {
            label: currentYear,
            backgroundColor: "#ed64a6",
            borderColor: "#ed64a6",
            data: dataCurrent,
            fill: false,
            barThickness: 8,
          },
          {
            label: lastYear,
            fill: false,
            backgroundColor: "#4c51bf",
            borderColor: "#4c51bf",
            data: dataLast,
            barThickness: 8,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: "rgba(0,0,0,.4)",
            },
            align: "end",
            position: "bottom",
          },
          title: {
            display: false,
            text: "Accident by Month",
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
            display: false,
            title: {
              display: true,
              text: "Month",
            },
            grid: {
              borderDash: [2],
              color: "rgba(33, 37, 41, 0.3)",
              zeroLineColor: "rgba(33, 37, 41, 0.3)",
              zeroLineBorderDash: [2],
            },
          },
          y: {
            display: true,
            title: {
              display: false,
              text: "Value",
            },
            grid: {
              borderDash: [2],
              drawBorder: false,
              color: "rgba(33, 37, 41, 0.2)",
              zeroLineColor: "rgba(33, 37, 41, 0.15)",
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
  }, [accidents, from, to]);

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
      <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
        <div className="flex flex-wrap items-center justify-between">
          <div>
            <h6 className="uppercase text-blueGray-400 mb-1 text-xs font-semibold">
              Statistics
            </h6>
            <h2 className="text-blueGray-700 text-xl font-semibold">
              Accident by Month
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
        {/* Chart */}
        <div className="p-4 flex-auto">
        <div className="relative h-[150px]">
          <canvas ref={chartRef} className="w-full h-full"></canvas>
        </div>
      </div>
      </div>
    </div>
  );
}