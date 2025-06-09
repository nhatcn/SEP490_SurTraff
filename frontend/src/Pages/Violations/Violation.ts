export interface Violation {
  id: number;
  camera: { id: number; name: string };
  violationType: { id: number; name: string };
  vehicleType: { id: number; name: string };
  licensePlate: string;
  vehicleColor: string;
  vehicleBrand: string;
  imageUrl: string;
  videoUrl: string;
  violationTime: string;
  createdAt: string;
}

// /types/violation