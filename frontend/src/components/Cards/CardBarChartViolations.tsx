import React, { useEffect, useRef, useState } from "react";
import {
  Chart,
  registerables,
  ChartConfiguration,
  Chart as ChartJS,
} from "chart.js";

Chart.register(...registerables);

interface Violation {
  createdAt: string;
}

interface Props {
  violations: Violation[];
}

function getMonthlyStats(
  violations: Violation[],
  year: number,
  fromDate: Date | null,
  toDate: Date | null
): number[] {
  const months = Array(12).fill(0);
  violations.forEach((vio: Violation) => {
    const createdAt = vio?.createdAt;
    if (!createdAt) return;
    const date = new Date(createdAt);
    if (
      !isNaN(date.getTime()) &&
      date.getFullYear() === year &&
      (!fromDate || date >= fromDate) &&
      (!toDate || date <= toDate)
    ) {
      months[date.getMonth()]++;
    }
  });
  return months;
}

export default function CardBarChartViolationsMonth({ violations }: Props) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS<"bar", number[], string> | null>(null);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    const fromDate = from ? new Date(from + "T00:00:00") : null;
    const toDate = to ? new Date(to + "T23:59:59") : null;

    const dataCurrent = getMonthlyStats(violations, currentYear, fromDate, toDate);
    const dataLast = getMonthlyStats(violations, lastYear, fromDate, toDate);

    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const config: ChartConfiguration<"bar", number[], string> = {
      type: "bar",
      data: {
        labels: months,
        datasets: [
          {
            label: `${currentYear}`,
            backgroundColor: "#ed64a6",
            borderColor: "#ed64a6",
            data: dataCurrent,
            barThickness: 8,
          },
          {
            label: `${lastYear}`,
            backgroundColor: "#4c51bf",
            borderColor: "#4c51bf",
            data: dataLast,
            barThickness: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "rgba(0,0,0,.5)",
            },
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Month",
            },
            grid: {
              color: "rgba(33, 37, 41, 0.3)",
            },
          },
          y: {
            beginAtZero: true,
            grid: {
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
  }, [violations, from, to]);

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
      <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
        <div className="flex flex-wrap items-center justify-between">
          <div>
            <h6 className="uppercase text-blueGray-400 mb-1 text-xs font-semibold">
              Statistics
            </h6>
            <h2 className="text-blueGray-700 text-xl font-semibold">
              Violations by Month
            </h2>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            />
            <label className="text-xs">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
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
