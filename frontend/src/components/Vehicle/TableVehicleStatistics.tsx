import { useEffect, useRef, useState } from 'react';
import {
  Chart,
  registerables,
  ChartConfiguration,
  Chart as ChartJS,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import API_URL_BE from '../Link/LinkAPI';

Chart.register(...registerables, ChartDataLabels);

interface VehicleTracking {
  id: number;
  cameraId: number | null;
  vehicleTypeId: number | null;
  createdAt: string;
}

interface RowData {
  cameraId: number;
  truck: number;
  car: number;
  motorbike: number;
  totalTracking: number;
}

export default function TableVehicleTracking() {
  const [data, setData] = useState<VehicleTracking[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS<'bar'> | null>(null);

  useEffect(() => {
    fetch(API_URL_BE+'api/vehicle-tracking/all')
      .then(res => res.json())
      .then(data => setData(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    const group: { [cameraId: number]: RowData } = {};
    data.forEach(item => {
      if (!item.createdAt || item.cameraId == null) return;
      const date = new Date(item.createdAt);
      if ((fromDate && date < fromDate) || (toDate && date > toDate)) return;

      if (!group[item.cameraId]) {
        group[item.cameraId] = {
          cameraId: item.cameraId,
          truck: 0,
          car: 0,
          motorbike: 0,
          totalTracking: 0,
        };
      }
      if (item.vehicleTypeId === 1) group[item.cameraId].car += 1;
      if (item.vehicleTypeId === 2) group[item.cameraId].truck += 1;
      if (item.vehicleTypeId === 3) group[item.cameraId].motorbike += 1;
      group[item.cameraId].totalTracking += 1;
    });

    const rowValues = Object.values(group);
    setRows(rowValues);

    if (!chartRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const labels = rowValues.map(r => `Cam ${r.cameraId}`);

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Car',
            data: rowValues.map(r => r.car),
            backgroundColor: '#4c51bf',
          },
          {
            label: 'Truck',
            data: rowValues.map(r => r.truck),
            backgroundColor: '#ed64a6',
          },
          {
            label: 'Motorbike',
            data: rowValues.map(r => r.motorbike),
            backgroundColor: '#38b2ac',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          datalabels: {
            display: true,
            color: 'white',
            formatter: (value, context) => {
              if (value === 0) return '';
              const total = rowValues[context.dataIndex].totalTracking;
              const percentage = total ? ((value / total) * 100).toFixed(1) : '0';
              return `${percentage}%`;
            },
          },
          legend: { position: 'bottom' },
        },
        scales: {
          x: {
            stacked: true,
            title: { display: true, text: 'Camera ID' },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: { display: true, text: 'Number of Vehicles' },
          },
        },
      },
      plugins: [ChartDataLabels],
    };

    const ctx = chartRef.current.getContext('2d');
    if (ctx) chartInstanceRef.current = new Chart(ctx, config);
  }, [data, from, to]);

  return (
    <div className="p-6 space-y-8">
      {/* Chart + Filter */}
      <div className="min-h-[600px] bg-white rounded shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold"></h2>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-600">From</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="border rounded px-2 py-1 text-xs bg-white"
            />
            <label className="text-xs text-gray-600">To</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="border rounded px-2 py-1 text-xs bg-white"
            />
          </div>
        </div>
        <div className="h-[500px] w-full">
          <canvas ref={chartRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
