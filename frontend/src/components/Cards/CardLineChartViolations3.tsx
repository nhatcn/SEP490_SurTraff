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
  vehicleId: string | number | null;
  type?: string;
}

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

const COLORS = ["#4c51bf"];

function toISODateString(dateStr: string): string {
  return dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
}

// Tạo nhãn và thống kê theo đơn vị (ngày/tháng/năm)
function getGroupedStats(
  violations: Violation[],
  fromDate: Date,
  toDate: Date,
  groupBy: "day" | "month" | "year"
): { labels: string[]; counts: number[] } {
  const formatKey = (d: Date) => {
    if (groupBy === "day") return d.toISOString().slice(0, 10);
    if (groupBy === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return `${d.getFullYear()}`;
  };

  const countsMap = new Map<string, number>();

  violations.forEach((vio) => {
    if (!vio.createdAt) return;
    const date = new Date(toISODateString(vio.createdAt));
    if (isNaN(date.getTime())) return;
    if (date < fromDate || date > toDate) return;

    const key = formatKey(date);
    countsMap.set(key, (countsMap.get(key) || 0) + 1);
  });

  // Tạo mảng labels theo thứ tự thời gian
  const labels: string[] = [];
  const current = new Date(fromDate);

  while (current <= toDate) {
    const key = formatKey(current);
    if (!labels.includes(key)) labels.push(key);

    if (groupBy === "day") current.setDate(current.getDate() + 1);
    else if (groupBy === "month") current.setMonth(current.getMonth() + 1);
    else current.setFullYear(current.getFullYear() + 1);
  }

  const counts = labels.map((label) => countsMap.get(label) || 0);

  return { labels, counts };
}

const CardLineChartViolations3: React.FC<Props> = ({ violationDetails }) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS<"line"> | null>(null);

  // Map violationDetails về dạng Violation[]
  const violations: Violation[] = violationDetails.map((v) => ({
    createdAt: v.violationTime || v.createdAt || "",
    vehicleId: v.violationId,
    type: v.violationTypeId?.toString() || "unknown",
  }));

  // Lấy ngày lớn nhất trong dữ liệu (mới nhất)
  const allDates = violations
    .map((v) => v.createdAt)
    .filter(Boolean)
    .map((d) => new Date(toISODateString(d)));
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();
  // Lấy ngày nhỏ nhất là 7 ngày trước ngày mới nhất
  const minDate = allDates.length
    ? new Date(new Date(maxDate).setDate(maxDate.getDate() - 6))
    : new Date();

  // State filter, mặc định là 1 tuần gần nhất
  const [from, setFrom] = useState(minDate.toISOString().slice(0, 10));
  const [to, setTo] = useState(maxDate.toISOString().slice(0, 10));
  const [type, setType] = useState("All");

  // Nếu violationDetails thay đổi, reset filter về 1 tuần gần nhất
  useEffect(() => {
    if (allDates.length) {
      const newMax = new Date(Math.max(...allDates.map((d) => d.getTime())));
      const newMin = new Date(new Date(newMax).setDate(newMax.getDate() - 6));
      setFrom(newMin.toISOString().slice(0, 10));
      setTo(newMax.toISOString().slice(0, 10));
      setType("All");
    }
    // eslint-disable-next-line
  }, [violationDetails.length]);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (!fromDate || !toDate) return;

    const diffDays = Math.ceil((+toDate - +fromDate) / (1000 * 60 * 60 * 24));

    const groupBy: "day" | "month" | "year" =
      diffDays <= 30 ? "day" : diffDays <= 365 ? "month" : "year";

    const filtered = violations.filter((vio) => {
      const date = new Date(toISODateString(vio.createdAt));
      const matchDate = date >= fromDate && date <= toDate;
      const matchType = type === "All" || vio.type === type;
      return matchDate && matchType;
    });

    const { labels, counts } = getGroupedStats(filtered, fromDate, toDate, groupBy);

    const dataset = {
      label: "",
      data: counts,
      backgroundColor: COLORS[0],
      borderColor: COLORS[0],
      fill: false,
      tension: 0.3,
    };

    const config: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        labels,
        datasets: [dataset],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: {
            display: false,
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
              text:
                groupBy === "day"
                  ? "Date"
                  : groupBy === "month"
                  ? "Month"
                  : "Year",
            },
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
            title: {
              display: true,
              text: "Violations",
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
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, config);

    return () => {
      chartInstanceRef.current?.destroy();
    };
  }, [violations, from, to, type]);

  return (
    <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-blueGray-700">
      <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
        <div className="flex flex-wrap items-center justify-between">
          <div>
            <h6 className="uppercase text-blueGray-400 mb-1 text-xs font-semibold">
              Statistics
            </h6>
            <h2 className="text-blueGray-700 text-xl font-semibold">
              Violations over Time
            </h2>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <label className="text-xs text-white">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border rounded px-2 py-1 text-xs bg-white"
            >
              <option value="All">All</option>
              <option value="1">Red Light</option>
              <option value="2">Speeding Vehicles</option>
              <option value="3">Illegal Parking</option>
              <option value="4">Lane Violations</option>
              <option value="5">Helmet Violations</option>
            </select>
            <label className="text-xs text-white">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded px-2 py-1 text-xs bg-white"
            />
            <label className="text-xs text-white">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
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
};

export default CardLineChartViolations3;
