import { useState } from "react";
import { Zone, LaneDirection } from '../../types/Camera/camera';

interface LaneDirectionConfigProps {
  zones: Zone[];
  laneDirections: LaneDirection[];
  setLaneDirections: React.Dispatch<React.SetStateAction<LaneDirection[]>>;
}

export default function LaneDirectionConfig({ 
  zones, 
  laneDirections, 
  setLaneDirections 
}: LaneDirectionConfigProps) {
  const [fromZoneId, setFromZoneId] = useState("");
  const [toZoneId, setToZoneId] = useState("");

  const laneZones = zones.filter(zone => zone.type === 'lane');

  const getUsedZoneIds = () => {
    const usedIds = new Set<string>();
    laneDirections.forEach(dir => {
      usedIds.add(dir.fromZoneId);
      usedIds.add(dir.toZoneId);
    });
    return usedIds;
  };

  const handleAddDirection = () => {
    if (!fromZoneId || !toZoneId) {
      alert("Please select both FROM and TO zones");
      return;
    }

    if (fromZoneId === toZoneId) {
      alert("FROM zone and TO zone must be different");
      return;
    }

    const exists = laneDirections.some(dir => 
      dir.fromZoneId === fromZoneId && dir.toZoneId === toZoneId
    );

    if (exists) {
      alert("This direction already exists");
      return;
    }

    const fromZone = laneZones.find(z => z.id === fromZoneId);
    const toZone = laneZones.find(z => z.id === toZoneId);

    if (!fromZone || !toZone) return;

    const newDirection: LaneDirection = {
      id: Date.now().toString(),
      fromZoneId,
      toZoneId,
      name: `${fromZone.name} → ${toZone.name}`,
      fromZoneName: fromZone.name,
      toZoneName: toZone.name
    };

    setLaneDirections(prev => [...prev, newDirection]);
    
    setFromZoneId("");
    setToZoneId("");
  };

  const handleDeleteDirection = (id: string) => {
    setLaneDirections(prev => prev.filter(dir => dir.id !== id));
  };

  const usedZoneIds = getUsedZoneIds();

  if (laneZones.length < 2) {
    return (
      <div className="bg-gray-50 p-4 rounded">
        <h4 className="font-medium mb-2">Lane Directions</h4>
        <p className="text-gray-600 text-sm">You need at least 2 lane zones to configure directions.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 rounded">
      <h4 className="font-medium mb-4">Lane Directions Configuration</h4>
      <p className="text-sm text-gray-600 mb-4">
        Define the correct flow direction between lane zones. When a vehicle passes through From zone first, then To zone, it's considered moving in the correct direction.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">From Zone</label>
          <select
            value={fromZoneId}
            onChange={(e) => setFromZoneId(e.target.value)}
            className="w-full p-2 border rounded text-sm"
          >
            <option value="">Select From zone</option>
            {laneZones
              .filter(zone => !usedZoneIds.has(zone.id))
              .map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">To Zone</label>
          <select
            value={toZoneId}
            onChange={(e) => setToZoneId(e.target.value)}
            className="w-full p-2 border rounded text-sm"
          >
            <option value="">Select To zone</option>
            {laneZones
              .filter(zone => zone.id !== fromZoneId && !usedZoneIds.has(zone.id))
              .map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
          </select>
        </div>
      </div>
      
      <button
        onClick={handleAddDirection}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        disabled={!fromZoneId || !toZoneId}
      >
        Add Direction
      </button>
      
      {laneDirections.length > 0 && (
        <div className="mt-4">
          <h5 className="font-medium mb-2">Configured Directions ({laneDirections.length})</h5>
          <div className="space-y-2">
            {laneDirections.map(direction => (
              <div key={direction.id} className="flex items-center justify-between p-3 bg-white rounded border">
                <div>
                  <div className="font-medium text-sm">{direction.name}</div>
                  
                </div>
                <button
                  onClick={() => handleDeleteDirection(direction.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}