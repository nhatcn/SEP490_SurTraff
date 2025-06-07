import { useState, useRef, useEffect } from "react";
import { Zone } from "../../types/Camera/camera";

// CHUẨN HÓA KÍCH THƯỚC - Kích thước chuẩn để lưu vào DB
const STANDARD_WIDTH = 640;
const STANDARD_HEIGHT = 480;
const STANDARD_ASPECT_RATIO = STANDARD_WIDTH / STANDARD_HEIGHT; // 4:3

interface UseZoneCanvasProps {
  zones: Zone[];
  setZones: React.Dispatch<React.SetStateAction<Zone[]>>;
  thumbnailUrl: string;
  nextZoneId: number;
  setNextZoneId: React.Dispatch<React.SetStateAction<number>>;
}

export const useZoneCanvas = ({
  zones,
  setZones,
  thumbnailUrl,
  nextZoneId,
  setNextZoneId
}: UseZoneCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentPoints, setCurrentPoints] = useState<number[][]>([]);
  const [displaySize, setDisplaySize] = useState({ width: 640, height: 480 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [activeZoneType, setActiveZoneType] = useState<string | null>(null);

  // Danh sách các loại zone
  const zoneTypes = [
    { value: 'lane', label: 'Lane Zone', color: '#3B82F6', icon: '🛣️' },
    { value: 'line', label: 'Line Zone', color: '#EF4444', icon: '📏' },
    { value: 'light', label: 'Light Zone', color: '#F59E0B', icon: '🚦' },
    { value: 'speed', label: 'Speed Zone', color: '#10B981', icon: '🚗' }
  ];

  // Load image
  useEffect(() => {
    const img = new Image();
    img.src = thumbnailUrl;
    img.onload = () => {
      imgRef.current = img;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      redrawCanvas();
    };
  }, [thumbnailUrl]);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDisplaySize = () => {
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
    };

    updateDisplaySize();
    
    window.addEventListener('resize', updateDisplaySize);
    return () => window.removeEventListener('resize', updateDisplaySize);
  }, []);

  // Update canvas size when display size changes
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = displaySize.width;
      canvasRef.current.height = displaySize.height;
      redrawCanvas();
    }
  }, [displaySize]);

  // Redraw when zones or current points change
  useEffect(() => {
    redrawCanvas();
  }, [zones, currentPoints]);

  // Coordinate conversion functions
  const convertFromStandardToDisplay = (standardCoords: number[][]): number[][] => {
    const scaleX = displaySize.width / STANDARD_WIDTH;
    const scaleY = displaySize.height / STANDARD_HEIGHT;
    
    return standardCoords.map(([x, y]) => [
      Math.round(x * scaleX),
      Math.round(y * scaleY)
    ]);
  };

  const convertFromDisplayToStandard = (displayCoords: number[][]): number[][] => {
    const scaleX = STANDARD_WIDTH / displaySize.width;
    const scaleY = STANDARD_HEIGHT / displaySize.height;
    
    return displayCoords.map(([x, y]) => [
      Math.round(x * scaleX),
      Math.round(y * scaleY)
    ]);
  };

  const getZoneColor = (zoneType: string | null): string => {
    switch(zoneType) {
      case 'lane': return "#3B82F6";
      case 'line': return "#EF4444";
      case 'light': return "#F59E0B";
      case 'speed': return "#10B981";
      default: return "#888";
    }
  };

  const getZoneRequirements = (zoneType: string | null): { min: number; max?: number } => {
    switch(zoneType) {
      case 'line': return { min: 2, max: 2 };
      case 'speed': return { min: 4, max: 4 };
      case 'lane':
      case 'light':
      default: return { min: 4 };
    }
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

  const handleZoneTypeChange = (zoneType: string) => {
    setActiveZoneType(zoneType);
    setCurrentPoints([]); // Clear current points when switching zone type
  };

  const handleClearSelection = () => {
    setActiveZoneType(null);
    setCurrentPoints([]);
  };

  const getInstructionText = () => {
    if (!activeZoneType) return "";
    
    if (activeZoneType === 'line') {
      return 'Exactly 2 points required for line zones.';
    } else if (activeZoneType === 'speed') {
      return 'Exactly 4 points required for speed measurement zone.';
    } else {
      return 'Minimum 4 points required for polygon zones.';
    }
  };

  const isFinishButtonDisabled = () => {
    if (!activeZoneType) return true;
    
    const requirements = getZoneRequirements(activeZoneType);
    if (requirements.max) {
      return currentPoints.length !== requirements.min;
    } else {
      return currentPoints.length < requirements.min;
    }
  };

  const getFinishButtonText = () => {
    if (!activeZoneType) return "Finish Zone";
    
    const requirements = getZoneRequirements(activeZoneType);
    const maxText = requirements.max || `${requirements.min}+`;
    return `Finish Zone (${currentPoints.length}/${maxText})`;
  };

  return {
    // Refs
    canvasRef,
    containerRef,
    
    // State
    currentPoints,
    displaySize,
    imageSize,
    activeZoneType,
    zoneTypes,
    
    // Handlers
    handleCanvasClick,
    handleFinishZone,
    handleClearPoints,
    handleUndoPoint,
    handleZoneTypeChange,
    handleClearSelection,
    
    // Utilities
    getInstructionText,
    getZoneRequirements,
    isFinishButtonDisabled,
    getFinishButtonText,
    
    // Constants
    STANDARD_WIDTH,
    STANDARD_HEIGHT
  };
};