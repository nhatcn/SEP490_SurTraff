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

interface CardBarChartProps {
  accidents: Accident[];
}

function getMonthlyStats(
  accidents: Accident[],
  year: number,
  fromMonth: number | null,
  fromYear: number | null,
  toMonth: number | null,
  toYear: number | null
): number[] {
  const months = Array(12).fill(0);
  accidents.forEach((acc) => {
    const date = new Date(acc.accidentTime);
    if (!isNaN(date.getTime()) && date.getFullYear() === year) {
      const accMonth = date.getMonth() + 1; // 1-12
      const accYear = date.getFullYear();

      let isInRange = true;

      if (fromMonth !== null && fromYear !== null) {
        if (
          accYear < fromYear ||
          (accYear === fromYear && accMonth < fromMonth)
        ) {
          isInRange = false;
        }
      }

      if (toMonth !== null && toYear !== null) {
        if (
          accYear > toYear ||
          (accYear === toYear && accMonth > toMonth)
        ) {
          isInRange = false;
        }
      }

      if (isInRange) {
        months[date.getMonth()]++;
      }
    }
  });
  return months;
}

export default function CardBarChart({ accidents }: CardBarChartProps) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS<"bar", number[], string> | null>(null);

  const [fromMonthYear, setFromMonthYear] = useState<string>("");
  const [toMonthYear, setToMonthYear] = useState<string>("");

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    // Parse from / to month-year
    let fromMonth: number | null = null;
    let fromYear: number | null = null;
    let toMonth: number | null = null;
    let toYear: number | null = null;

    if (fromMonthYear) {
      const [year, month] = fromMonthYear.split("-");
      fromYear = parseInt(year);
      fromMonth = parseInt(month);
    }
    if (toMonthYear) {
      const [year, month] = toMonthYear.split("-");
      toYear = parseInt(year);
      toMonth = parseInt(month);
    }

    const dataCurrent = getMonthlyStats(
      accidents,
      currentYear,
      fromMonth,
      fromYear,
      toMonth,
      toYear
    );
    const dataLast = getMonthlyStats(
      accidents,
      lastYear,
      fromMonth,
      fromYear,
      toMonth,
      toYear
    );

    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const hasCurrent = dataCurrent.some((v) => v > 0);
    const hasLast = dataLast.some((v) => v > 0);

    const datasets: any[] = [];
    if (hasCurrent) {
      datasets.push({
        label: `${currentYear}`,
        backgroundColor: "#4c51bf", // năm hiện tại
        borderColor: "#4c51bf",
        data: dataCurrent,
        barThickness: 8,
      });
    }
    if (hasLast) {
      datasets.push({
        label: `${lastYear}`,
        backgroundColor: "#ed64a6", // năm trước
        borderColor: "#ed64a6",
        data: dataLast,
        barThickness: 8,
      });
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const config: ChartConfiguration<"bar", number[], string> = {
      type: "bar",
      data: { labels: months, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "rgba(0,0,0,0.5)",
              font: { size: 12 },
            },
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          x: {
            title: { display: true, text: "Month" },
            grid: { color: "rgba(33, 37, 41, 0.3)" },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(33, 37, 41, 0.2)" },
          },
        },
      },
    };

    chartInstanceRef.current = new Chart(ctx, config);

    return () => {
      chartInstanceRef.current?.destroy();
    };
  }, [accidents, fromMonthYear, toMonthYear]);

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded h-[340px] md:h-[380px]">
      <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
        <div className="flex flex-wrap items-center justify-between">
          <div>
            <h6 className="uppercase text-blueGray-400 mb-1 text-xs font-semibold">
              Statistics
            </h6>
            <h2 className="text-blueGray-700 text-xl font-semibold">
              Accidents by Month
            </h2>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs">From</label>
            <input
              type="month"
              value={fromMonthYear}
              onChange={(e) => setFromMonthYear(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            />
            <label className="text-xs">To</label>
            <input
              type="month"
              value={toMonthYear}
              onChange={(e) => setToMonthYear(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            />
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
