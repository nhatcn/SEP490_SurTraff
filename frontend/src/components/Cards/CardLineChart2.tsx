import React, { useEffect, useRef, useState } from "react";
import {
  Chart,
  registerables,
  ChartConfiguration,
  Chart as ChartJS,
} from "chart.js";

Chart.register(...registerables);

interface Accident {
  accidentTime: string;
}

interface Props {
  accidents: Accident[];
}

const COLORS = [
  "#4c51bf", "#ed64a6", "#38b2ac", "#ecc94b",
  "#f56565", "#4299e1", "#48bb78", "#9f7aea",
];

function toISODateString(dateStr: string): string {
  return dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
}

// Lấy ngày hiện tại theo định dạng YYYY-MM-DD
function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function getMonthlyStats(
  accidents: Accident[],
  year: number,
  fromDate?: Date | null,
  toDate?: Date | null
): number[] {
  const monthlyCounts = Array(12).fill(0);
  accidents.forEach((acc) => {
    if (!acc.accidentTime) return;
    const date = new Date(toISODateString(acc.accidentTime));
    if (
      !isNaN(date.getTime()) &&
      date.getFullYear() === year &&
      (!fromDate || date >= fromDate) &&
      (!toDate || date <= toDate)
    ) {
      monthlyCounts[date.getMonth()]++;
    }
  });
  return monthlyCounts;
}

export default function CardLineChartAccidents2({ accidents }: Props) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS<"line"> | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const todayString = getTodayString();

  // Xử lý thay đổi ngày From
  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    if (selectedDate <= todayString) {
      setFrom(selectedDate);
      // Nếu ngày From lớn hơn ngày To, reset ngày To
      if (to && selectedDate > to) {
        setTo("");
      }
    }
  };

  // Xử lý thay đổi ngày To
  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    if (selectedDate <= todayString) {
      // Kiểm tra nếu có ngày From, ngày To phải >= ngày From
      if (!from || selectedDate >= from) {
        setTo(selectedDate);
      }
    }
  };

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    const yearsSet = new Set<number>();
    accidents.forEach((acc) => {
      if (!acc.accidentTime) return;
      const date = new Date(toISODateString(acc.accidentTime));
      if (
        !isNaN(date.getTime()) &&
        (!fromDate || date >= fromDate) &&
        (!toDate || date <= toDate)
      ) {
        yearsSet.add(date.getFullYear());
      }
    });

    const years = Array.from(yearsSet).sort();

    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const currentYear = new Date().getFullYear();

    const datasets = years.map((year) => {
      const color = year === currentYear ? "#4c51bf" : "#ed64a6";
      return {
        label: `${year}`,
        data: getMonthlyStats(accidents, year, fromDate, toDate),
        backgroundColor: color,
        borderColor: color,
        fill: false,
        tension: 0.3,
      };
    });

    const config: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        labels: months,
        datasets,
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              color: "#1a202c",
            },
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
            title: {
              display: true,
              text: "Month",
              color: "black",
            },
            ticks: {
              color: "black",
            },
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Accidents",
              color: "black",
            },
            ticks: {
              precision: 0,
              color: "black",
            },
            grid: {
              display: false,
              color: "rgba(33, 37, 41, 0.3)",
            },
          },
        },
      },
    };

    const ctx = chartRef.current.getContext("2d");
    if (ctx) {
      chartInstanceRef.current = new Chart(ctx, config);
    }

    return () => {
      chartInstanceRef.current?.destroy();
    };
  }, [accidents, from, to]);

  return (
    <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-blueGray-700">
      <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
        <div className="flex flex-wrap items-center justify-between">
          <div>
            <h6 className="uppercase text-blueGray-400 mb-1 text-xs font-semibold">
              Statistics
            </h6>
            <h2 className="text-blueGray-700 text-xl font-semibold">
              Accidents by Year
            </h2>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-white">From</label>
            <input
              type="date"
              value={from}
              max={todayString}
              onChange={handleFromChange}
              className="border rounded px-2 py-1 text-xs bg-white"
            />
            <label className="text-xs text-white">To</label>
            <input
              type="date"
              value={to}
              min={from || undefined}
              max={todayString}
              onChange={handleToChange}
              className="border rounded px-2 py-1 text-xs bg-white"
            />
          </div>
        </div>
      </div>
      <div className="p-4 flex-auto">
        <div className="relative h-[200px]">
          <canvas ref={chartRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}