export interface AccidentType {
  id: number
  camera_id: number
  camera: {
    id: number
    name: string
  }
  image_url: string
  description: string
  video_url: string
  location: string
  accident_time: string
  created_at: string
  user_fullName: string
  user_email: string
  licensePlate: string
  status: string
}
