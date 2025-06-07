
export interface Zone {
  id: string;
  type: "lane" | "line" | "light" | "speed";
  coordinates: number[][];
  name: string;
  color: string;
}

export interface LaneDirection {
  id: string;
  fromZoneId: string;
  toZoneId: string;
  name: string;
  fromZoneName: string;
  toZoneName: string;
}

export interface LightZoneMapping {
  id: string;
  lightZoneId: string;
  laneZoneId: string;
  lightZoneName: string;
  laneZoneName: string;
}