import { useState, useEffect } from 'react';
import L from 'leaflet';

interface UseCurrentLocationProps {
  mapRef: L.Map | null;
}

export const useCurrentLocation = ({ mapRef }: UseCurrentLocationProps) => {
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Get current location on component mount
  useEffect(() => {
    const getCurrentLocation = () => {
      setIsGettingLocation(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentLocation([latitude, longitude]);
            if (mapRef) {
              mapRef.setView([latitude, longitude], 15);
            }
            setIsGettingLocation(false);
          },
          (error) => {
            console.warn("Error getting location:", error);
            setIsGettingLocation(false);
            // Fallback to Hanoi coordinates
          },
          { 
            enableHighAccuracy: true, 
            timeout: 5000, 
            maximumAge: 0 
          }
        );
      } else {
        setIsGettingLocation(false);
      }
    };

    if (mapRef) {
      getCurrentLocation();
    }
  }, [mapRef]);

  const getCurrentLocationManually = async (): Promise<{ lat: number; lng: number; address: string } | null> => {
    setIsGettingLocation(true);
    
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentLocation([latitude, longitude]);
            
            if (mapRef) {
              mapRef.setView([latitude, longitude], 15);
            }
            
            // Reverse geocode to get address
            try {
              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              const data = await response.json();
              const address = data.display_name || "Address not found";
              
              setIsGettingLocation(false);
              resolve({ lat: latitude, lng: longitude, address });
            } catch (error) {
              console.error("Error in reverse geocoding:", error);
              setIsGettingLocation(false);
              resolve({ lat: latitude, lng: longitude, address: "Failed to get address" });
            }
          },
          (error) => {
            console.error("Error getting location:", error);
            alert("Unable to get your current location. Please check your browser permissions.");
            setIsGettingLocation(false);
            resolve(null);
          },
          { 
            enableHighAccuracy: true, 
            timeout: 10000, 
            maximumAge: 0 
          }
        );
      } else {
        alert("Geolocation is not supported by this browser.");
        setIsGettingLocation(false);
        resolve(null);
      }
    });
  };

  return {
    currentLocation,
    isGettingLocation,
    getCurrentLocationManually
  };
};