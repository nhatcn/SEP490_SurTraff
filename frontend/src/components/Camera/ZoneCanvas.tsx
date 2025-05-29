import { useState, useRef, useEffect } from "react";
import { Zone } from "../../Pages/Dashboard/Camera/AddCamera";

interface ZoneCanvasProps {
  activeZoneType: string | null;
  zones: Zone[];
  setZones: React.Dispatch<React.SetStateAction<Zone[]>>;
  thumbnailUrl: string;
  nextZoneId: number;
  setNextZoneId: React.Dispatch<React.SetStateAction<number>>;
  onDeleteZone: (id: string) => void;
}

// CHUẨN HÓA KÍCH THƯỚC - Kích thước chuẩn để lưu vào DB
const STANDARD_WIDTH = 640;
const STANDARD_HEIGHT = 480;
const STANDARD_ASPECT_RATIO = STANDARD_WIDTH / STANDARD_HEIGHT; // 4:3

export default function ZoneCanvas({ 
  activeZoneType,
  zones,
  setZones,
  thumbnailUrl,
  nextZoneId,
  setNextZoneId,
  onDeleteZone
}: ZoneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [currentPoints, setCurrentPoints] = useState<number[][]>([]);
  const [displaySize, setDisplaySize] = useState({ width: 640, height: 480 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const img = new Image();
    img.src = thumbnailUrl;
    img.onload = () => {
      imgRef.current = img;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      redrawCanvas();
    };
  }, [thumbnailUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth - 20; // padding
    const maxWidth = Math.min(containerWidth, 800); // giới hạn tối đa
    
    // Tính kích thước hiển thị dựa trên tỷ lệ chuẩn
    let displayWidth, displayHeight;
    
    if (maxWidth / STANDARD_ASPECT_RATIO <= 600) { // chiều cao không vượt quá 600px
      displayWidth = maxWidth;
      displayHeight = maxWidth / STANDARD_ASPECT_RATIO;
    } else {
      displayHeight = 600;
      displayWidth = 600 * STANDARD_ASPECT_RATIO;
    }
    
    setDisplaySize({
      width: Math.floor(displayWidth),
      height: Math.floor(displayHeight)
    });
    
    const handleResize = () => {
      if (!containerRef.current) return;
      const newContainerWidth = containerRef.current.clientWidth - 20;
      const newMaxWidth = Math.min(newContainerWidth, 800);
      
      let newDisplayWidth, newDisplayHeight;
      if (newMaxWidth / STANDARD_ASPECT_RATIO <= 600) {
        newDisplayWidth = newMaxWidth;
        newDisplayHeight = newMaxWidth / STANDARD_ASPECT_RATIO;
      } else {
        newDisplayHeight = 600;
        newDisplayWidth = 600 * STANDARD_ASPECT_RATIO;
      }
      
      setDisplaySize({
        width: Math.floor(newDisplayWidth),
        height: Math.floor(newDisplayHeight)
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = displaySize.width;
      canvasRef.current.height = displaySize.height;
      redrawCanvas();
    }
  }, [displaySize]);

  useEffect(() => {
    redrawCanvas();
  }, [zones, currentPoints]);

  // Chuyển đổi tọa độ từ kích thước chuẩn sang kích thước hiển thị
  const convertFromStandardToDisplay = (standardCoords: number[][]): number[][] => {
    const scaleX = displaySize.width / STANDARD_WIDTH;
    const scaleY = displaySize.height / STANDARD_HEIGHT;
    
    return standardCoords.map(([x, y]) => [
      Math.round(x * scaleX),
      Math.round(y * scaleY)
    ]);
  };

  // Chuyển đổi tọa độ từ kích thước hiển thị sang kích thước chuẩn
  const convertFromDisplayToStandard = (displayCoords: number[][]): number[][] => {
    const scaleX = STANDARD_WIDTH / displaySize.width;
    const scaleY = STANDARD_HEIGHT / displaySize.height;
    
    return displayCoords.map(([x, y]) => [
      Math.round(x * scaleX),
      Math.round(y * scaleY)
    ]);
  };

  const redrawCanvas = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || !canvas.width || !canvas.height) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Vẽ background image
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    }
    
    // Vẽ zones đã lưu (chuyển đổi từ tọa độ chuẩn sang hiển thị)
    zones.forEach(zone => {
      const displayCoords = convertFromStandardToDisplay(zone.coordinates);
      
      ctx.beginPath();
      
      if (displayCoords.length > 0) {
        ctx.moveTo(displayCoords[0][0], displayCoords[0][1]);
        
        for (let i = 1; i < displayCoords.length; i++) {
          ctx.lineTo(displayCoords[i][0], displayCoords[i][1]);
        }
        
        if (zone.type !== 'line') {
          ctx.closePath();
        }
      }
      
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      
      if (zone.type !== 'line') {
        ctx.fillStyle = `${zone.color}33`;
        ctx.fill();
      }

      // Vẽ tên zone cho lane zones
      if (zone.type === 'lane' && displayCoords.length > 0) {
        const centerX = displayCoords.reduce((sum, coord) => sum + coord[0], 0) / displayCoords.length;
        const centerY = displayCoords.reduce((sum, coord) => sum + coord[1], 0) / displayCoords.length;
        
        ctx.fillStyle = "#000";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(zone.name, centerX, centerY);
      }
    });
    
    // Vẽ các điểm đang vẽ (tọa độ hiển thị)
    if (currentPoints.length > 0) {
      // Vẽ điểm
      currentPoints.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point[0], point[1], 4, 0, Math.PI * 2);
        ctx.fillStyle = getZoneColor(activeZoneType);
        ctx.fill();
        
        ctx.fillStyle = "#000";
        ctx.font = "12px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`${index + 1}`, point[0] + 6, point[1] - 6);
      });
      
      // Nối các điểm
      ctx.beginPath();
      ctx.moveTo(currentPoints[0][0], currentPoints[0][1]);
      
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i][0], currentPoints[i][1]);
      }
      
      if (activeZoneType !== 'line' && currentPoints.length > 2) {
        ctx.lineTo(currentPoints[0][0], currentPoints[0][1]);
      }
      
      ctx.strokeStyle = getZoneColor(activeZoneType);
      ctx.lineWidth = 2;
      ctx.stroke();
      
      if (activeZoneType !== 'line' && currentPoints.length > 2) {
        ctx.fillStyle = `${getZoneColor(activeZoneType)}33`;
        ctx.fill();
      }
    }
  };

  const getZoneColor = (zoneType: string | null): string => {
    switch(zoneType) {
      case 'lane': return "#3B82F6";
      case 'line': return "#EF4444";
      case 'light': return "#F59E0B";
      default: return "#888";
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeZoneType) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Tọa độ click trên canvas hiển thị
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (activeZoneType === 'line') {
      if (currentPoints.length < 2) {
        setCurrentPoints([...currentPoints, [x, y]]);
      } else {
        setCurrentPoints([currentPoints[0], [x, y]]);
      }
    } else {
      setCurrentPoints([...currentPoints, [x, y]]);
    }
  };

  const handleFinishZone = () => {
    if (!activeZoneType) return;
    
    let isValid = false;
    
    if (activeZoneType === 'line') {
      isValid = currentPoints.length === 2;
    } else {
      isValid = currentPoints.length >= 4;
    }
    
    if (isValid) {
      // Chuyển đổi tọa độ từ hiển thị sang chuẩn trước khi lưu
      const standardCoords = convertFromDisplayToStandard(currentPoints);
      
      const newZone: Zone = {
        id: nextZoneId.toString(),
        type: activeZoneType as "lane" | "line" | "light",
        coordinates: standardCoords, // Lưu tọa độ chuẩn
        name: `${activeZoneType.charAt(0).toUpperCase() + activeZoneType.slice(1)} Zone ${nextZoneId}`,
        color: getZoneColor(activeZoneType)
      };
      
      setZones(prev => [...prev, newZone]);
      setNextZoneId(prev => prev + 1);
      setCurrentPoints([]);
    } else if (activeZoneType !== 'line' && currentPoints.length < 4) {
      alert(`${activeZoneType.charAt(0).toUpperCase() + activeZoneType.slice(1)} zones must have at least 4 points.`);
    }
  };

  const handleClearPoints = () => {
    setCurrentPoints([]);
  };

  const handleUndoPoint = () => {
    if (currentPoints.length > 0) {
      setCurrentPoints(currentPoints.slice(0, -1));
    }
  };

  return (
    <div>
      {/* Thông tin kích thước để debug */}
      <div className="mb-2 text-sm text-gray-600">
        Display: {displaySize.width}x{displaySize.height} | 
        Standard: {STANDARD_WIDTH}x{STANDARD_HEIGHT} |
        Image: {imageSize.width}x{imageSize.height}
      </div>
      
      <div ref={containerRef} className="relative border rounded flex justify-center">
        <canvas
          ref={canvasRef}
          width={displaySize.width}
          height={displaySize.height}
          className="cursor-crosshair border"
          onClick={handleCanvasClick}
        />
        {!activeZoneType && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white">
            Select a zone type to start drawing
          </div>
        )}
        {activeZoneType && (
          <div className="absolute bottom-2 left-2 bg-white bg-opacity-75 px-2 py-1 text-sm rounded">
            Click to add points. {activeZoneType !== 'line' ? 'Minimum 4 points required for polygon zones.' 
              : 'Exactly 2 points required for line zones.'}
          </div>
        )}
        
        {activeZoneType && currentPoints.length > 0 && (
          <div className="absolute top-2 right-2 bg-white bg-opacity-90 p-2 rounded flex gap-2">
            <button 
              onClick={handleUndoPoint}
              className="px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
            >
              Undo Point
            </button>
            <button 
              onClick={handleClearPoints}
              className="px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
            >
            Clear All
            </button>
            <button 
              onClick={handleFinishZone}
              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              disabled={(activeZoneType === 'line' && currentPoints.length !== 2) || 
                (activeZoneType !== 'line' && currentPoints.length < 4)}
            >
              Finish Zone
            </button>
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <h4 className="font-medium mb-2">Defined Zones ({zones.length})</h4>
        {zones.length === 0 ? (
          <div className="text-gray-500 italic">No zones defined yet</div>
        ) : (
          <div className="space-y-2">
            {zones.map(zone => (
              <div key={zone.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 mr-2 rounded-full" 
                    style={{ backgroundColor: zone.color }}
                  ></div>
                  <span>{zone.name} ({zone.coordinates.length} points)</span>
                </div>
                <button
                  onClick={() => onDeleteZone(zone.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}