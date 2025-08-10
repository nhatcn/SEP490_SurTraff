import { useState, useEffect } from 'react';
import L from 'leaflet';

interface UseLocationSearchProps {
  mapRef: L.Map | null;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

export const useLocationSearch = ({ mapRef, onLocationSelect }: UseLocationSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Search suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 3) {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=vn`
        );
        const data = await response.json();
        setSearchSuggestions(data);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef) return;

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=vn`);
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lon);

        mapRef.setView([latNum, lngNum], 15);
        onLocationSelect(latNum, lngNum, data[0].display_name || "");
      } else {
        alert("Location not found. Please try another search term.");
      }
    } catch (error) {
      console.error("Error searching location:", error);
      alert("Error searching for location");
    }
    
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: any) => {
    const latNum = parseFloat(suggestion.lat);
    const lngNum = parseFloat(suggestion.lon);
    
    if (mapRef) {
      mapRef.setView([latNum, lngNum], 15);
      onLocationSelect(latNum, lngNum, suggestion.display_name || "");
    }
    
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
  };

  return {
    searchQuery,
    setSearchQuery,
    searchSuggestions,
    showSuggestions,
    setShowSuggestions,
    handleSearch,
    handleSuggestionClick
  };
};