import React, { useEffect, useRef } from "react";
import {
  Chart,
  registerables,
  Chart as ChartJS,
  ChartConfiguration,
} from "chart.js";

Chart.register(...registerables);

interface Violation {
  vehicleId: string | number | null;
  createdAt: string;
}

interface Props {
  violations: Violation[];
}

function getTopVehicleViolations(violations: Violation[], limit: number) {
  const stats: Record<string, number> = {};
  violations.forEach((vio) => {
    if (vio.vehicleId == null) return;
    const id = String(vio.vehicleId);
    stats[id] = (stats[id] || 0) + 1;
  });
  return Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export default function CardBarChartViolations2({ violations }: Props) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS<"bar", number[], string> | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const stats = getTopVehicleViolations(violations, 5); // Top 5
    const labels = stats.map(([vehicleId]) => `Vehicle ${vehicleId}`);
    const data = stats.map(([, count]) => count);

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const config: ChartConfiguration<"bar", number[], string> = {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Top 5 Vehicles by Violations",
            backgroundColor: "#ed64a6",
            borderColor: "#ed64a6",
            data,
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
            display: true,
            title: {
              display: true,
              text: "Vehicle ID",
            },
            grid: {
              color: "rgba(33, 37, 41, 0.3)",
            },
          },
          y: {
            display: true,
            beginAtZero: true,
            title: {
              display: true,
              text: "Violation Count",
            },
            ticks: {
              precision: 0,
            },
            grid: {
              display: false,
              color: "rgba(33, 37, 41, 0.2)",
            },
          },
        },
      },
    };

    chartInstanceRef.current = new Chart(ctx, config);

    return () => {
      chartInstanceRef.current?.destroy();
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
        <div className="relative h-[200px]">
          <canvas ref={chartRef} className="w-full h-full" height={200}></canvas>
        </div>
      </div>
    </div>
  );
}
