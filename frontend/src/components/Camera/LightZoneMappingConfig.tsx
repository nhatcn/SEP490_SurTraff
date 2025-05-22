import { useState } from "react";
import { Zone, LightZoneMapping } from "../../Pages/Dashboard/AddCamera";

interface LightZoneMappingConfigProps {
  zones: Zone[];
  lightZoneMappings: LightZoneMapping[];
  setLightZoneMappings: React.Dispatch<React.SetStateAction<LightZoneMapping[]>>;
}

export default function LightZoneMappingConfig({ 
  zones, 
  lightZoneMappings, 
  setLightZoneMappings 
}: LightZoneMappingConfigProps) {
  const [lightZoneId, setLightZoneId] = useState("");
  const [laneZoneId, setLaneZoneId] = useState("");

  const lightZones = zones.filter(zone => zone.type === 'light');
  const laneZones = zones.filter(zone => zone.type === 'lane');

  const getMappedLightZoneIds = () => {
    return new Set(lightZoneMappings.map(mapping => mapping.lightZoneId));
  };

  const handleAddMapping = () => {
    if (!lightZoneId || !laneZoneId) {
      alert("Please select both Light Zone and Lane Zone");
      return;
    }

    const exists = lightZoneMappings.some(mapping => 
      mapping.lightZoneId === lightZoneId
    );

    if (exists) {
      alert("This light zone is already mapped to a lane zone");
      return;
    }

    const lightZone = lightZones.find(z => z.id === lightZoneId);
    const laneZone = laneZones.find(z => z.id === laneZoneId);

    if (!lightZone || !laneZone) return;

    const newMapping: LightZoneMapping = {
      id: Date.now().toString(),
      lightZoneId,
      laneZoneId,
      lightZoneName: lightZone.name,
      laneZoneName: laneZone.name
    };

    setLightZoneMappings(prev => [...prev, newMapping]);
    
    setLightZoneId("");
    setLaneZoneId("");
  };

  const handleDeleteMapping = (id: string) => {
    setLightZoneMappings(prev => prev.filter(mapping => mapping.id !== id));
  };

  const mappedLightZoneIds = getMappedLightZoneIds();

  if (lightZones.length === 0) {
    return (
      <div className="bg-amber-50 p-4 rounded">
        <h4 className="font-medium mb-2">Light Zone Mapping</h4>
        <p className="text-amber-700 text-sm">No light zones available. Create light zones first to configure mappings.</p>
      </div>
    );
  }

  if (laneZones.length === 0) {
    return (
      <div className="bg-amber-50 p-4 rounded">
        <h4 className="font-medium mb-2">Light Zone Mapping</h4>
        <p className="text-amber-700 text-sm">No lane zones available. Create lane zones first to configure light zone mappings.</p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 p-4 rounded">
      <h4 className="font-medium mb-4">Light Zone to Lane Zone Mapping</h4>
      <p className="text-sm text-amber-700 mb-4">
        Map each light zone to a corresponding lane zone. This helps associate traffic light detection with specific traffic lanes.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Light Zone</label>
          <select
            value={lightZoneId}
            onChange={(e) => setLightZoneId(e.target.value)}
            className="w-full p-2 border rounded text-sm"
          >
            <option value="">Select Light zone</option>
            {lightZones
              .filter(zone => !mappedLightZoneIds.has(zone.id))
              .map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Lane Zone</label>
          <select
            value={laneZoneId}
            onChange={(e) => setLaneZoneId(e.target.value)}
            className="w-full p-2 border rounded text-sm"
          >
            <option value="">Select Lane zone</option>
            {laneZones.map(zone => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <button
        onClick={handleAddMapping}
        className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm"
        disabled={!lightZoneId || !laneZoneId}
      >
        Add Mapping
      </button>
      
      {lightZoneMappings.length > 0 && (
        <div className="mt-4">
          <h5 className="font-medium mb-2">Configured Mappings ({lightZoneMappings.length})</h5>
          <div className="space-y-2">
            {lightZoneMappings.map(mapping => (
              <div key={mapping.id} className="flex items-center justify-between p-3 bg-white rounded border">
                <div>
                  <div className="font-medium text-sm">
                    {mapping.lightZoneName} → {mapping.laneZoneName}
                  </div>

                </div>
                <button
                  onClick={() => handleDeleteMapping(mapping.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {lightZones.length > lightZoneMappings.length && (
        <div className="mt-4 p-3 bg-amber-100 rounded">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> You have {lightZones.length - lightZoneMappings.length} unmapped light zone(s). 
            Consider mapping all light zones to lane zones for complete traffic analysis.
          </p>
        </div>
      )}
    </div>
  );
}