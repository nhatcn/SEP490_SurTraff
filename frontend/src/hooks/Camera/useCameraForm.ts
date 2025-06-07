import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zone, LaneDirection, LightZoneMapping } from '../../types/Camera/camera';

export const useCameraForm = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [location, setLocation] = useState({ lat: 0, lng: 0, selected: false });
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeZoneType, setActiveZoneType] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("https://cdn.discordapp.com/attachments/1242410259205591071/1377269674659811389/image.png?ex=68438e96&is=68423d16&hm=ffc97abae41913c441886bc5d32c35636f9cba23e2980d04730e55b9b087e98d&");
  const [laneDirections, setLaneDirections] = useState<LaneDirection[]>([]);
  const [lightZoneMappings, setLightZoneMappings] = useState<LightZoneMapping[]>([]);

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setLocation({
      lat,
      lng,
      selected: true
    });
    setLocationAddress(address);
  };

  const handleDeleteZone = (id: string) => {
    setZones(zones.filter(zone => zone.id !== id));

    // Remove related lane directions
    setLaneDirections(prev => prev.filter(dir =>
      dir.fromZoneId !== id && dir.toZoneId !== id
    ));

    // Remove related light zone mappings
    setLightZoneMappings(prev => prev.filter(mapping =>
      mapping.lightZoneId !== id && mapping.laneZoneId !== id
    ));
  };

  const handleSubmit = async () => {
    if (!name || !streamUrl || !location.selected || !locationAddress || zones.length === 0) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const setupData = {
        cameraName: name,
        cameraUrl: streamUrl,
        latitude: location.lat,
        longitude: location.lng,
        location: locationAddress,
        thumbnail: thumbnailUrl,
        
        zones: zones.map(z => ({
          id: parseInt(z.id),
          name: z.name,
          zoneType: z.type.toLowerCase(),
          coordinates: JSON.stringify(z.coordinates)
        })),
        zoneLightLaneLinks: lightZoneMappings.map(mapping => ({
          lightZoneId: parseInt(mapping.lightZoneId),
          laneZoneId: parseInt(mapping.laneZoneId)
        })),
        laneMovements: laneDirections.map(dir => ({
          fromLaneZoneId: parseInt(dir.fromZoneId),
          toLaneZoneId: parseInt(dir.toZoneId)
        }))
      };

      console.log('Sending camera setup data:', setupData);

      const response = await fetch("http://localhost:8081/api/cameras/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setupData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to setup camera: ${errorData}`);
      }

      alert("Camera setup successfully!");
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error("Setup error:", error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return {
    // Form state
    name,
    setName,
    streamUrl,
    setStreamUrl,
    locationAddress,
    setLocationAddress,
    location,
    zones,
    setZones,
    activeZoneType,
    setActiveZoneType,
    thumbnailUrl,
    setThumbnailUrl,
    laneDirections,
    setLaneDirections,
    lightZoneMappings,
    setLightZoneMappings,
    
    // Handlers
    handleLocationSelect,
    handleDeleteZone,
    handleSubmit,
    navigate
  };
};