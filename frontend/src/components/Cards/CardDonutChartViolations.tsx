import React, { useEffect, useRef, useState } from "react";
import {
  Chart,
  ArcElement,
  Tooltip,
  Chart as ChartJS,
  ChartConfiguration,
} from "chart.js";

Chart.register(ArcElement, Tooltip);

interface ViolationDetails {
  id: number;
  violationId: number;
  violationTypeId: number | null;
  imageUrl: string | null;
  videoUrl: string | null;
  location: string | null;
  violationTime: string | null;
  speed: number | null;
  additionalNotes: string | null;
  createdAt: string | null;
}

interface Props {
  violationDetails: ViolationDetails[];
}

const VIOLATION_LABELS: Record<string, string> = {
  "1": "Red Light",
  "2": "Speeding",
  "3": "Illegal Parking",
  "4": "Lane Violation",
  "5": "Helmet Violation",
  unknown: "Unknown",
};

const COLORS = [
  "#4c51bf", // Red Light
  "#2dce89", // Speeding
  "#f5365c", // Parking
  "#fb6340", // Lane
  "#ffd600", // Helmet
  "#6c757d", // Unknown
];

const CardDonutChart: React.FC<Props> = ({ violationDetails }) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS<"doughnut"> | null>(null);
  const [chartData, setChartData] = useState<
    { label: string; count: number; color: string; percent: string }[]
  >([]);

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 6);

    const filtered = violationDetails.filter((v) => {
      const time = new Date(v.violationTime || v.createdAt || "");
      return !isNaN(time.getTime()) && time >= last7Days;
    });

    const typeCounts: Record<string, number> = {};
    filtered.forEach((v) => {
      const type = v.violationTypeId?.toString() || "unknown";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const total = Object.values(typeCounts).reduce((sum, val) => sum + val, 0);

    const entries = Object.entries(typeCounts).map(([type, count], i) => ({
      label: VIOLATION_LABELS[type] || "Other",
      count,
      color: COLORS[i % COLORS.length],
      percent: ((count / total) * 100).toFixed(0),
    }));

    setChartData(entries);

    const config: ChartConfiguration<"doughnut"> = {
      type: "doughnut",
      data: {
        labels: entries.map((e) => e.label),
        datasets: [
          {
            label: "Violation Types",
            data: entries.map((e) => e.count),
            backgroundColor: entries.map((e) => e.color),
            hoverOffset: 10,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: false,
          },
        },
        cutout: "60%",
        responsive: true,
        maintainAspectRatio: false,
      },
    };

    const ctx = chartRef.current.getContext("2d");
    if (ctx) chartInstanceRef.current = new Chart(ctx, config);

    return () => {
      chartInstanceRef.current?.destroy();
    };
  }, [violationDetails]);

  return (
    <div className="relative flex flex-col w-full shadow-lg rounded bg-white h-[400px] overflow-hidden">
      <div className="px-4 py-3">
        <h6 className="uppercase text-blueGray-400 text-xs font-semibold">
          Statistics
        </h6>
        <h2 className="text-blueGray-700 text-xl font-semibold">
          Violation Type by Week
        </h2>
      </div>

      {/* Chart */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-[200px] h-[200px]">
          <canvas ref={chartRef} className="w-full h-full" />
        </div>
      </div>

      {/* Custom Legend */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
          {chartData.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 min-w-[130px]"
            >
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: item.color }}
              ></span>
              <span className="text-gray-700 text-xs whitespace-nowrap">{item.label}</span>
              <span className="text-gray-700 font-semibold text-xs ml-auto">{item.percent}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CardDonutChart;
