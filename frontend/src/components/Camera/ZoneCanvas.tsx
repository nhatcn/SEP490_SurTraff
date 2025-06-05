import { useState, useRef, useEffect } from "react";
import { Zone } from "../../Pages/Dashboard/Camera/AddCamera";

interface ZoneCanvasProps {
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
  
  // State cho việc chọn zone type - đã di chuyển vào component này
  const [activeZoneType, setActiveZoneType] = useState<string | null>(null);
  
  // Danh sách các loại zone
  const zoneTypes = [
    { value: 'lane', label: 'Lane Zone', color: '#3B82F6', icon: '🛣️' },
    { value: 'line', label: 'Line Zone', color: '#EF4444', icon: '📏' },
    { value: 'light', label: 'Light Zone', color: '#F59E0B', icon: '🚦' },
    { value: 'speed', label: 'Speed Zone', color: '#10B981', icon: '🚗' }
  ];
  
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

      // Vẽ tên zone cho lane zones và speed zones
      if ((zone.type === 'lane' || zone.type === 'speed') && displayCoords.length > 0) {
        const centerX = displayCoords.reduce((sum, coord) => sum + coord[0], 0) / displayCoords.length;
        const centerY = displayCoords.reduce((sum, coord) => sum + coord[1], 0) / displayCoords.length;
        
        ctx.fillStyle = "#000";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(zone.name, centerX, centerY);
      }

      // Thêm icon hoặc ký hiệu đặc biệt cho speed zone
      if (zone.type === 'speed' && displayCoords.length > 0) {
        const centerX = displayCoords.reduce((sum, coord) => sum + coord[0], 0) / displayCoords.length;
        const centerY = displayCoords.reduce((sum, coord) => sum + coord[1], 0) / displayCoords.length;
        
        // Vẽ biểu tượng tốc độ (speedometer icon)
        ctx.fillStyle = zone.color;
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("🚗", centerX, centerY - 20);
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
      case 'speed': return "#10B981"; // Màu xanh lá cho speed zone
      default: return "#888";
    }
  };

  const getZoneRequirements = (zoneType: string | null): { min: number; max?: number } => {
    switch(zoneType) {
      case 'line': return { min: 2, max: 2 };
      case 'speed': return { min: 4, max: 4 }; // Speed zone cần đúng 4 điểm
      case 'lane':
      case 'light':
      default: return { min: 4 }; // Minimum 4 points, no maximum
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeZoneType) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Tọa độ click trên canvas hiển thị
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const requirements = getZoneRequirements(activeZoneType);
    
    if (activeZoneType === 'line') {
      if (currentPoints.length < 2) {
        setCurrentPoints([...currentPoints, [x, y]]);
      } else {
        setCurrentPoints([currentPoints[0], [x, y]]);
      }
    } else if (activeZoneType === 'speed') {
      if (currentPoints.length < 4) {
        setCurrentPoints([...currentPoints, [x, y]]);
      } else {
        // Replace the oldest point if already have 4 points
        const newPoints = [...currentPoints.slice(1), [x, y]];
        setCurrentPoints(newPoints);
      }
    } else {
      setCurrentPoints([...currentPoints, [x, y]]);
    }
  };

  const handleFinishZone = () => {
    if (!activeZoneType) return;
    
    const requirements = getZoneRequirements(activeZoneType);
    let isValid = false;
    
    if (requirements.max) {
      // Fixed number of points required
      isValid = currentPoints.length === requirements.min;
    } else {
      // Minimum number of points required
      isValid = currentPoints.length >= requirements.min;
    }
    
    if (isValid) {
      // Chuyển đổi tọa độ từ hiển thị sang chuẩn trước khi lưu
      const standardCoords = convertFromDisplayToStandard(currentPoints);
      
      const newZone: Zone = {
        id: nextZoneId.toString(),
        type: activeZoneType as "lane" | "line" | "light" | "speed",
        coordinates: standardCoords, // Lưu tọa độ chuẩn
        name: `${activeZoneType.charAt(0).toUpperCase() + activeZoneType.slice(1)} Zone ${nextZoneId}`,
        color: getZoneColor(activeZoneType)
      };
      
      setZones(prev => [...prev, newZone]);
      setNextZoneId(prev => prev + 1);
      setCurrentPoints([]);
    } else {
      const requirements = getZoneRequirements(activeZoneType);
      if (requirements.max) {
        alert(`${activeZoneType.charAt(0).toUpperCase() + activeZoneType.slice(1)} zones must have exactly ${requirements.min} points.`);
      } else {
        alert(`${activeZoneType.charAt(0).toUpperCase() + activeZoneType.slice(1)} zones must have at least ${requirements.min} points.`);
      }
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

  const getInstructionText = () => {
    if (!activeZoneType) return "";
    
    const requirements = getZoneRequirements(activeZoneType);
    
    if (activeZoneType === 'line') {
      return 'Exactly 2 points required for line zones.';
    } else if (activeZoneType === 'speed') {
      return 'Exactly 4 points required for speed measurement zone.';
    } else {
      return 'Minimum 4 points required for polygon zones.';
    }
  };

  return (
    <div>
      {/* Zone Type Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Select Zone Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {zoneTypes.map(type => (
            <button
              key={type.value}
              onClick={() => {
                setActiveZoneType(type.value);
                setCurrentPoints([]); // Clear current points when switching zone type
              }}
              className={`p-3 rounded-lg border-2 font-medium transition-all duration-200 ${
                activeZoneType === type.value
                  ? 'border-2 text-white shadow-lg'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
              style={{
                backgroundColor: activeZoneType === type.value ? type.color : undefined,
                borderColor: activeZoneType === type.value ? type.color : undefined
              }}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl">{type.icon}</span>
                <span className="text-sm">{type.label}</span>
              </div>
            </button>
          ))}
        </div>
        
        {/* Clear Selection Button */}
        <button
          onClick={() => {
            setActiveZoneType(null);
            setCurrentPoints([]);
          }}
          className="mt-3 px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Clear Selection
        </button>
        
        {/* Zone Instructions */}
        {activeZoneType && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">{zoneTypes.find(t => t.value === activeZoneType)?.icon}</span>
              <div>
                <strong className="text-blue-800">
                  {zoneTypes.find(t => t.value === activeZoneType)?.label}:
                </strong>
                <span className="text-blue-700 ml-2">
                  {activeZoneType === 'line' && 'Click exactly 2 points to create a line.'}
                  {activeZoneType === 'speed' && 'Click exactly 4 points to create a speed measurement zone.'}
                  {(activeZoneType === 'lane' || activeZoneType === 'light') && 'Click at least 4 points to create a polygon zone.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

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
            Click to add points. {getInstructionText()}
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
              disabled={(() => {
                const requirements = getZoneRequirements(activeZoneType);
                if (requirements.max) {
                  return currentPoints.length !== requirements.min;
                } else {
                  return currentPoints.length < requirements.min;
                }
              })()}
            >
              Finish Zone ({currentPoints.length}/{getZoneRequirements(activeZoneType).max || `${getZoneRequirements(activeZoneType).min}+`})
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
                  <span>
                    {zone.name} ({zone.coordinates.length} points)
                    {zone.type === 'speed' && <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 rounded">SPEED</span>}
                  </span>
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