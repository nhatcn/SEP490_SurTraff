import { Zone } from '../../types/Camera/camera';
import { useZoneCanvas } from "../../hooks/Camera/useZoneCanvas";

interface ZoneCanvasProps {
  zones: Zone[];
  setZones: React.Dispatch<React.SetStateAction<Zone[]>>;
  thumbnailUrl: string;
  nextZoneId: number;
  setNextZoneId: React.Dispatch<React.SetStateAction<number>>;
  onDeleteZone: (id: string) => void;
}

export default function ZoneCanvas({ 
  zones,
  setZones,
  thumbnailUrl,
  nextZoneId,
  setNextZoneId,
  onDeleteZone
}: ZoneCanvasProps) {
  const {
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
  } = useZoneCanvas({
    zones,
    setZones,
    thumbnailUrl,
    nextZoneId,
    setNextZoneId
  });

  return (
    <div>
      {/* Zone Type Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Select Zone Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {zoneTypes.map(type => (
            <button
              key={type.value}
              onClick={() => handleZoneTypeChange(type.value)}
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
          onClick={handleClearSelection}
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
              disabled={isFinishButtonDisabled()}
            >
              {getFinishButtonText()}
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