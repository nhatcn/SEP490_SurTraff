import { useState, useRef, useEffect } from "react";
import { Zone } from "../../types/Camera/camera";

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

  // Danh sách các loại zone (removed speed zone)
  const zoneTypes = [
    { value: 'lane', label: 'Lane Zone', color: '#3B82F6', icon: '🛣️' },
    { value: 'line', label: 'Line Zone', color: '#EF4444', icon: '📏' },
    { value: 'light', label: 'Light Zone', color: '#F59E0B', icon: '🚦' }
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
      if (!containerRef.current || !imageSize.width || !imageSize.height) return;
      
      const containerWidth = containerRef.current.clientWidth - 20; // padding
      const maxWidth = Math.min(containerWidth, 800); // giới hạn tối đa
      
      // Tính kích thước hiển thị dựa trên tỷ lệ thực của image
      const imageAspectRatio = imageSize.width / imageSize.height;
      let displayWidth, displayHeight;
      
      if (maxWidth / imageAspectRatio <= 600) { // chiều cao không vượt quá 600px
        displayWidth = maxWidth;
        displayHeight = maxWidth / imageAspectRatio;
      } else {
        displayHeight = 600;
        displayWidth = 600 * imageAspectRatio;
      }
      
      setDisplaySize({
        width: Math.floor(displayWidth),
        height: Math.floor(displayHeight)
      });
    };

    updateDisplaySize();
    
    window.addEventListener('resize', updateDisplaySize);
    return () => window.removeEventListener('resize', updateDisplaySize);
  }, [imageSize]);

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

  // Coordinate conversion functions - CHUYỂN ĐỔI SANG PHẦN TRĂM
  const convertFromPercentageToDisplay = (percentageCoords: number[][]): number[][] => {
    return percentageCoords.map(([x, y]) => [
      Math.round((x * displaySize.width) / 100),
      Math.round((y * displaySize.height) / 100)
    ]);
  };

  const convertFromDisplayToPercentage = (displayCoords: number[][]): number[][] => {
    return displayCoords.map(([x, y]) => [
      Math.round((x / displaySize.width) * 100 * 100) / 100, // Làm tròn 2 chữ số thập phân
      Math.round((y / displaySize.height) * 100 * 100) / 100
    ]);
  };

  const getZoneColor = (zoneType: string | null): string => {
    switch(zoneType) {
      case 'lane': return "#3B82F6";
      case 'line': return "#EF4444";
      case 'light': return "#F59E0B";
      default: return "#888";
    }
  };

  const getZoneRequirements = (zoneType: string | null): { min: number; max?: number } => {
    switch(zoneType) {
      case 'line': return { min: 2, max: 2 };
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
    
    // Vẽ zones đã lưu (chuyển đổi từ phần trăm sang hiển thị)
    zones.forEach(zone => {
      const displayCoords = convertFromPercentageToDisplay(zone.coordinates);
      
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
      // Chuyển đổi tọa độ từ hiển thị sang phần trăm trước khi lưu
      const percentageCoords = convertFromDisplayToPercentage(currentPoints);
      
      const newZone: Zone = {
        id: nextZoneId.toString(),
        type: activeZoneType as "lane" | "line" | "light",
        coordinates: percentageCoords, // Lưu tọa độ theo phần trăm
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
    
    // Coordinate conversion utilities
    convertFromPercentageToDisplay,
    convertFromDisplayToPercentage
  };
};