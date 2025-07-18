export interface AccidentType {
  id: number
  camera_id: number
  camera: {
    id: number
    name: string
  }
  
  imageUrl: string
  description: string
  videoUrl: string
  location: string
  accidentTime: string
  createdAt: string
  userFullName: string
  userEmail: string
  licensePlate: string
  status: string
}
