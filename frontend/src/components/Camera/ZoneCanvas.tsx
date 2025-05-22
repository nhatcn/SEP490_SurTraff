import { useState, useRef, useEffect } from "react";
import { Zone } from "../../Pages/Dashboard/AddCamera";

interface ZoneCanvasProps {
  activeZoneType: string | null;
  zones: Zone[];
  setZones: React.Dispatch<React.SetStateAction<Zone[]>>;
  thumbnailUrl: string;
  nextZoneId: number;
  setNextZoneId: React.Dispatch<React.SetStateAction<number>>;
  onDeleteZone: (id: string) => void;
}

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
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const img = new Image();
    img.src = thumbnailUrl;
    img.onload = () => {
      imgRef.current = img;
      redrawCanvas();
    };
  }, [thumbnailUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    setCanvasSize({
      width: containerWidth,
      height: containerWidth * 0.66
    });
    
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      setCanvasSize({
        width: newWidth,
        height: newWidth * 0.66
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = canvasSize.width;
      canvasRef.current.height = canvasSize.height;
      redrawCanvas();
    }
  }, [canvasSize]);

  useEffect(() => {
    redrawCanvas();
  }, [zones, currentPoints]);

  const redrawCanvas = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || !canvas.width || !canvas.height) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    }
    
    // Draw existing zones
    zones.forEach(zone => {
      ctx.beginPath();
      
      if (zone.coordinates.length > 0) {
        ctx.moveTo(zone.coordinates[0][0], zone.coordinates[0][1]);
        
        for (let i = 1; i < zone.coordinates.length; i++) {
          ctx.lineTo(zone.coordinates[i][0], zone.coordinates[i][1]);
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

      // Draw zone name for lane zones
      if (zone.type === 'lane' && zone.coordinates.length > 0) {
        const centerX = zone.coordinates.reduce((sum, coord) => sum + coord[0], 0) / zone.coordinates.length;
        const centerY = zone.coordinates.reduce((sum, coord) => sum + coord[1], 0) / zone.coordinates.length;
        
        ctx.fillStyle = "#000";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(zone.name, centerX, centerY);
      }
    });
    
    // Draw current points and connecting lines
    if (currentPoints.length > 0) {
      // Draw points
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
      
      // Connect points with lines
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
      const newZone: Zone = {
        id: nextZoneId.toString(),
        type: activeZoneType as "lane" | "line" | "light",
        coordinates: currentPoints,
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
      <div ref={containerRef} className="relative border rounded">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="cursor-crosshair"
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