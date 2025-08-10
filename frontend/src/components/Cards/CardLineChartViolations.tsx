import React, { useEffect, useRef } from "react";
import {
  Chart,
  registerables,
  ChartConfiguration,
  Chart as ChartJS,
} from "chart.js";

Chart.register(...registerables);

interface Violation {
  vehicleId: string | number | null;
  createdAt: string;
}

interface Props {
  violations: Violation[];
}

// Hàm lấy 7 ngày gần nhất (yyyy-mm-dd)
function getLast7Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// Đếm số vi phạm mỗi ngày
function countViolationsByDay(violations: Violation[], days: string[]): number[] {
  return days.map(
    (day) =>
      violations.filter(
        (vio) => vio.createdAt && vio.createdAt.slice(0, 10) === day
      ).length
  );
}

export default function CardLineChartViolations({ violations }: Props) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS<"line"> | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const days = getLast7Days();
    const counts = countViolationsByDay(violations, days);

    const labels = days.map((d) => {
      const date = new Date(d);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const config: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Violations",
            backgroundColor: "#4c51bf",
            borderColor: "#4c51bf",
            data: counts,
            fill: false,
            tension: 0.3,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: {
            display: false,
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
            },
            title: {
              display: true,
              text: "Date",
            },
            grid: {
              display: false,
            },
          },
          y: {
            ticks: {
              precision: 0,
            },
            title: {
              display: true,
              text: "Violation Count",
            },
            grid: {
              display: false,
              color: "rgba(33, 37, 41, 0.3)",
            },
            beginAtZero: true,
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
  <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-blueGray-700 h-[340px] md:h-[380px] overflow-hidden">
    <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
      <div className="flex flex-wrap items-center justify-between">
        <div>
          <h6 className="uppercase text-blueGray-400 mb-1 text-xs font-semibold">
            Statistics
          </h6>
          <h2 className="text-blueGray-700 text-xl font-semibold">
            Violations by Week
          </h2>
        </div>
      </div>
    </div>
    <div className="p-4 flex-1 flex flex-col min-h-0">
      <div className="relative flex-1 min-h-[120px]">
        <canvas ref={chartRef} className="w-full h-full" />
      </div>
    </div>
  </div>
);
}
