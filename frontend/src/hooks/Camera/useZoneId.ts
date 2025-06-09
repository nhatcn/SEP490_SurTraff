import { useState, useEffect } from 'react';

export const useZoneId = () => {
  const [nextZoneId, setNextZoneId] = useState<number>(1);
  const [isLoadingZoneId, setIsLoadingZoneId] = useState<boolean>(true);

  useEffect(() => {
    const fetchLatestZoneId = async () => {
      try {
        setIsLoadingZoneId(true);
        const response = await fetch("http://localhost:8081/api/zones/last-zone-id");

        if (response.ok) {
          const data = await response.json();
          // Set next zone ID to be latest ID + 1, or 1 if no zones exist (null case = 0)
          setNextZoneId((data.lastZoneId || 0) + 1);
        } else {
          console.warn("Failed to fetch latest zone ID, using default");
          setNextZoneId(1);
        }
      } catch (error) {
        console.error("Error fetching latest zone ID:", error);
        // Use default value if API fails
        setNextZoneId(1);
      } finally {
        setIsLoadingZoneId(false);
      }
    };

    fetchLatestZoneId();
  }, []);

  return {
    nextZoneId,
    setNextZoneId,
    isLoadingZoneId
  };
};