import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { Pencil, Trash2, Save, X, Car, AlertCircle, CheckCircle, ArrowLeft, Eye } from 'lucide-react'
import Sidebar from '../../../components/Layout/Sidebar'
import Header from '../../../components/Layout/Header'

// Custom debounce function
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

interface VehicleType {
  id: number
  typeName: string
}

interface Vehicle {
  id: number
  name: string
  licensePlate: string
  vehicleTypeId: number
  color: string
  brand: string
  image: string | null
  isDelete: boolean | null
  userId: number | null
}

interface FormErrors {
  name?: string
  licensePlate?: string
  vehicleTypeId?: string
  color?: string
  brand?: string
  image?: string
}

interface EditForm {
  name: string
  licensePlate: string
  vehicleTypeId: string
  color: string
  brand: string
  image: File | null
}

const VehicleDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([])
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [editForm, setEditForm] = useState<EditForm>({
    name: '',
    licensePlate: '',
    vehicleTypeId: '',
    color: '',
    brand: '',
    image: null
  })

  // Preload vehicle image
  useEffect(() => {
    if (!vehicle?.image) {
      console.log('No image to preload: vehicle.image is null or undefined')
      return undefined
    }
    const cacheBuster = `?t=${new Date().getTime()}`
    const imageUrl = `${vehicle.image}${cacheBuster}`
    console.log('Preloading image:', imageUrl)
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = imageUrl
    link.as = 'image'
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [vehicle?.image])

  // Fetch vehicle types
  const fetchVehicleTypes = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8081/api/violations/vehicle-types', {
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
      const data: VehicleType[] = await response.json()
      setVehicleTypes(data)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(`Error loading vehicle types: ${message}`)
    }
  }, [])

  // Fetch vehicles
  const fetchVehicles = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8081/api/vehicle', {
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
      const data: Vehicle[] = await response.json()
      setVehicles(data)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(`Error loading vehicles: ${message}`)
    }
  }, [])

  // Fetch vehicle details
  const fetchVehicle = useCallback(async () => {
    if (!id || id === '0') return
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:8081/api/vehicle/${id}`, {
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
      const data: Vehicle = await response.json()
      console.log('Fetched vehicle:', data)
      setVehicle(data)
      setEditForm({
        name: data.name || '',
        licensePlate: data.licensePlate || '',
        vehicleTypeId: data.vehicleTypeId ? data.vehicleTypeId.toString() : '',
        color: data.color || '',
        brand: data.brand || '',
        image: null
      })
      setPreviewUrl(data.image || null)
      console.log('Set previewUrl:', data.image || 'null')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(`Error loading vehicle: ${message}`)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchVehicleTypes()
    fetchVehicles()
    fetchVehicle()
  }, [fetchVehicleTypes, fetchVehicles, fetchVehicle])

  const validateForm = () => {
    const newErrors: FormErrors = {}
    const plateRegex = /^\d{2}[A-Z]{1,2}-\d{4,5}$/
    const textRegex = /^[a-zA-Z0-9\s]+$/
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/

    if (!editForm.name || editForm.name.trim() === '') {
      newErrors.name = 'Vehicle name is required'
    } else if (specialCharRegex.test(editForm.name)) {
      newErrors.name = 'Vehicle name must not contain special characters'
    } else if (!textRegex.test(editForm.name)) {
      newErrors.name = 'Vehicle name must contain only letters, numbers, and spaces'
    }

    if (!editForm.licensePlate || editForm.licensePlate.trim() === '') {
      newErrors.licensePlate = 'License plate is required'
    } else if (!plateRegex.test(editForm.licensePlate)) {
      newErrors.licensePlate = 'Invalid format (e.g., 30A-12345 or 30AB-12345)'
    } else if (
      vehicles.some(v => v.licensePlate === editForm.licensePlate && v.id !== Number(id))
    ) {
      newErrors.licensePlate = 'License plate already exists'
    }

    if (!editForm.vehicleTypeId || editForm.vehicleTypeId.trim() === '') {
      newErrors.vehicleTypeId = 'Vehicle type is required'
    } else if (!vehicleTypes.some(type => type.id === parseInt(editForm.vehicleTypeId))) {
      newErrors.vehicleTypeId = 'Selected vehicle type is invalid'
    }

    if (!editForm.color || editForm.color.trim() === '') {
      newErrors.color = 'Color is required'
    } else if (specialCharRegex.test(editForm.color)) {
      newErrors.color = 'Color must not contain special characters'
    } else if (!textRegex.test(editForm.color)) {
      newErrors.color = 'Color must contain only letters, numbers, and spaces'
    }

    if (!editForm.brand || editForm.brand.trim() === '') {
      newErrors.brand = 'Brand is required'
    } else if (specialCharRegex.test(editForm.brand)) {
      newErrors.brand = 'Brand must not contain special characters'
    } else if (!textRegex.test(editForm.brand)) {
      newErrors.brand = 'Brand must contain only letters, numbers, and spaces'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleImageChange = debounce((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log('Selected file:', file)
    if (file) {
      setEditForm(prev => ({ ...prev, image: file }))
      setErrors(prev => ({ ...prev, image: '' }))
      const imageUrl = URL.createObjectURL(file)
      console.log('Preview URL:', imageUrl)
      setPreviewUrl(imageUrl)
      setIsModalOpen(true)
    }
  }, 300)

  const handleSave = debounce(async () => {
    if (!validateForm()) return

    setIsLoading(true)
    setSuccessMessage('')
    setErrorMessage('')
    try {
      const vehicleTypeIdNum = parseInt(editForm.vehicleTypeId)
      if (isNaN(vehicleTypeIdNum)) {
        throw new Error('Invalid vehicle type ID')
      }

      const vehicleDTO = {
        name: editForm.name,
        licensePlate: editForm.licensePlate,
        vehicleTypeId: vehicleTypeIdNum,
        color: editForm.color,
        brand: editForm.brand,
        userId: vehicle?.userId ?? null
      }
      console.log('Sending vehicleDTO:', vehicleDTO)
      const formData = new FormData()
      formData.append('dto', new Blob([JSON.stringify(vehicleDTO)], { type: 'application/json' }))
      if (editForm.image) {
        formData.append('imageFile', editForm.image)
      }

      const response = await fetch(`http://localhost:8081/api/vehicle/${id}`, {
        method: 'PUT',
        body: formData
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error: ${response.status}`)
      }
      const updatedData: Vehicle = await response.json()
      console.log('Updated vehicle:', updatedData)
      if (updatedData.userId === null && vehicle?.userId !== null) {
        console.warn('Backend overwrote userId to null! Expected:', vehicle?.userId)
      }
      setVehicle(updatedData)
      setVehicles(prev => prev.map(v => v.id === Number(id) ? updatedData : v))
      setSuccessMessage(`Vehicle ${updatedData.licensePlate} updated successfully!`)
      setIsEditing(false)
      setShowConfirm(false)
      setPreviewUrl(updatedData.image || null)
      console.log('Set previewUrl after save:', updatedData.image || 'null')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(`Error updating vehicle: ${message}`)
    } finally {
      setIsLoading(false)
    }
  }, 300)

  const handleDelete = debounce(async () => {
    if (!id) return
    setIsLoading(true)
    setSuccessMessage('')
    setErrorMessage('')
    try {
      const response = await fetch(`http://localhost:8081/api/vehicle/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
      setSuccessMessage('Vehicle deleted successfully!')
      setVehicles(prev => prev.filter(v => v.id !== Number(id)))
      setTimeout(() => navigate('/vehicle/add'), 2000)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(`Error deleting vehicle: ${message}`)
    } finally {
      setIsLoading(false)
      setShowDeleteConfirm(false)
    }
  }, 300)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (vehicle) {
      setEditForm({
        name: vehicle.name,
        licensePlate: vehicle.licensePlate,
        vehicleTypeId: vehicle.vehicleTypeId.toString(),
        color: vehicle.color,
        brand: vehicle.brand,
        image: null
      })
      setPreviewUrl(vehicle.image || null)
      console.log('Reset previewUrl on cancel:', vehicle.image || 'null')
    }
    setErrors({})
  }

  const MemoizedImage = React.memo(() => {
    const cacheBuster = `?t=${new Date().getTime()}`
    const imageSrc = previewUrl ? `${previewUrl}${previewUrl.includes('blob:') ? '' : cacheBuster}` : null
    console.log('Rendering MemoizedImage with src:', imageSrc || 'null')

    return (
      <motion.div 
        className="bg-gradient-to-br from-white/95 to-blue-100/95 forced-colors:bg-[Canvas] backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50 forced-colors:border-[CanvasText] transform hover:scale-[1.02] transition-all duration-300 h-full flex flex-col"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-cyan-600 bg-clip-text text-transparent forced-colors:text-[CanvasText] mb-4 flex items-center">
          <div className="w-6 h-6 mr-3 bg-gradient-to-r from-blue-500 to-cyan-500 forced-colors:bg-[ButtonFace] rounded-lg flex items-center justify-center animate-pulse-slow">
            <svg
              className="w-4 h-4 text-white forced-colors:text-[CanvasText]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          Vehicle Image
        </h3>
        {imageSrc ? (
          <div className="relative group flex-grow flex items-center justify-center">
            <img
              src={imageSrc}
              alt="Vehicle Image"
              className="w-full h-auto max-h-[300px] object-contain rounded-xl border-2 border-blue-200/50 forced-colors:border-[CanvasText] cursor-pointer transition-all duration-300 group-hover:border-blue-400 forced-colors:group-hover:border-[CanvasText] group-hover:shadow-2xl group-hover:shadow-blue-400/40 forced-colors:group-hover:shadow-none"
              onClick={() => setIsModalOpen(true)}
              onError={(e) => {
                console.error('Failed to load image:', imageSrc, 'Error:', e.currentTarget.onerror)
                e.currentTarget.src = 'https://via.placeholder.com/300'
              }}
              onLoad={() => console.log('Image loaded successfully:', imageSrc)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center forced-colors:bg-[Canvas]">
              <div className="bg-white/90 forced-colors:bg-[Canvas] backdrop-blur-sm rounded-full p-3 transform scale-90 group-hover:scale-100 transition-all duration-300">
                <Eye className="w-8 h-8 text-blue-600 forced-colors:text-[CanvasText]" />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500 forced-colors:text-[CanvasText] bg-blue-50/80 forced-colors:bg-[Canvas] rounded-xl flex-grow flex items-center justify-center">
            <div>
              <svg
                className="w-10 h-10 mx-auto mb-4 text-gray-400 forced-colors:text-[CanvasText]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="font-medium">No image available</p>
            </div>
          </div>
        )}
      </motion.div>
    )
  })

  if (!vehicle && id !== '0') {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-100 via-gray-50 to-blue-100 forced-colors:bg-[Canvas]">
        <Sidebar />
        <div className="flex flex-col flex-grow">
          <Header title="Vehicle Details" />
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 forced-colors:border-[CanvasText] mx-auto mb-4"></div>
              <p className="text-gray-600 forced-colors:text-[CanvasText]">Loading data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const inputVariants = {
    focused: { scale: 1.02, transition: { duration: 0.2 } },
    unfocused: { scale: 1, transition: { duration: 0.2 } }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-100 via-gray-50 to-blue-100 forced-colors:bg-[Canvas]">
      <Sidebar />
      <div className="flex flex-col flex-grow">
        <Header title={id === '0' ? 'Select Vehicle to Edit' : `Vehicle Details #${id}`} />
        
        <div className="p-6 overflow-y-auto">
          <button
            onClick={() => navigate('/vehicles')}
            className="mb-6 flex items-center space-x-2 text-gray-600 forced-colors:text-[CanvasText] hover:text-blue-600 forced-colors:hover:text-[CanvasText] transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to list</span>
          </button>

          <div className="bg-white forced-colors:bg-[Canvas] shadow rounded-2xl overflow-hidden max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 forced-colors:bg-[ButtonFace] p-6 text-white forced-colors:text-[CanvasText]">
              <div className="flex items-center space-x-3">
                <Car size={24} />
                <div>
                  <h1 className="text-xl font-bold">Vehicle Management</h1>
                  <p className="text-blue-100 forced-colors:text-[CanvasText]">Details and editing</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 forced-colors:text-[CanvasText] mb-2">
                  Select Vehicle
                </label>
                <select
                  value={id || ''}
                  onChange={(e) => navigate(`/vehicles/${e.target.value}`)}
                  className="w-full px-3 py-2 border border-gray-300 forced-colors:border-[CanvasText] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 forced-colors:focus:border-[CanvasText]"
                  disabled={isLoading}
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} - {v.name} ({v.brand})
                    </option>
                  ))}
                </select>
              </div>

              {id !== '0' && vehicle && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Vehicle Information */}
                  <div className="lg:col-span-2">
                    <motion.div 
                      className="bg-gradient-to-br from-white/95 to-blue-100/95 forced-colors:bg-[Canvas] backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50 forced-colors:border-[CanvasText] h-full"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 forced-colors:text-[CanvasText]">
                          Vehicle Information
                        </h2>
                        {!isEditing ? (
                          <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 forced-colors:bg-[ButtonFace] text-white forced-colors:text-[CanvasText] rounded-md hover:bg-blue-700 forced-colors:hover:bg-[ButtonFace] transition-colors"
                          >
                            <Pencil size={16} />
                            <span>Edit</span>
                          </button>
                        ) : (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setShowConfirm(true)}
                              className="flex items-center space-x-2 px-4 py-2 bg-green-600 forced-colors:bg-[ButtonFace] text-white forced-colors:text-[CanvasText] rounded-md hover:bg-green-700 forced-colors:hover:bg-[ButtonFace] transition-colors disabled:opacity-50"
                              disabled={isLoading}
                            >
                              <Save size={16} />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={handleCancel}
                              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 forced-colors:bg-[ButtonFace] text-white forced-colors:text-[CanvasText] rounded-md hover:bg-gray-600 forced-colors:hover:bg-[ButtonFace] transition-colors"
                            >
                              <X size={16} />
                              <span>Cancel</span>
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="flex items-center space-x-2 px-4 py-2 bg-red-600 forced-colors:bg-[ButtonFace] text-white forced-colors:text-[CanvasText] rounded-md hover:bg-red-700 forced-colors:hover:bg-[ButtonFace] transition-colors disabled:opacity-50"
                              disabled={isLoading}
                            >
                              <Trash2 size={16} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 forced-colors:text-[CanvasText] mb-1">
                            Vehicle Name
                          </label>
                          {isEditing ? (
                            <input
                              name="name"
                              value={editForm.name}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-300 forced-colors:border-[CanvasText] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 forced-colors:focus:border-[CanvasText]"
                              placeholder="e.g., Toyota Camry 2023"
                              disabled={isLoading}
                            />
                          ) : (
                            <p className="px-3 py-2 bg-gray-50 forced-colors:bg-[Canvas] border border-gray-200 forced-colors:border-[CanvasText] rounded-md">{vehicle.name}</p>
                          )}
                          <AnimatePresence>
                            {errors.name && (
                              <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-red-500 forced-colors:text-[CanvasText] text-xs flex items-center"
                              >
                                <AlertCircle size={12} className="mr-1" />
                                {errors.name}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </motion.div>

                        <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 forced-colors:text-[CanvasText] mb-1">
                            License Plate
                          </label>
                          {isEditing ? (
                            <input
                              name="licensePlate"
                              value={editForm.licensePlate}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-300 forced-colors:border-[CanvasText] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 forced-colors:focus:border-[CanvasText] font-mono font-bold"
                              placeholder="e.g., 30A-12345"
                              disabled={isLoading}
                            />
                          ) : (
                            <p className="px-3 py-2 bg-gray-50 forced-colors:bg-[Canvas] border border-gray-200 forced-colors:border-[CanvasText] rounded-md font-mono font-bold">{vehicle.licensePlate}</p>
                          )}
                          <AnimatePresence>
                            {errors.licensePlate && (
                              <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-red-500 forced-colors:text-[CanvasText] text-xs flex items-center"
                              >
                                <AlertCircle size={12} className="mr-1" />
                                {errors.licensePlate}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </motion.div>

                        <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 forced-colors:text-[CanvasText] mb-1">
                            Vehicle Type
                          </label>
                          {isEditing ? (
                            <select
                              name="vehicleTypeId"
                              value={editForm.vehicleTypeId}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-300 forced-colors:border-[CanvasText] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 forced-colors:focus:border-[CanvasText]"
                              disabled={isLoading}
                            >
                              <option value="">Select vehicle type</option>
                              {vehicleTypes.map(type => (
                                <option key={type.id} value={type.id}>{type.typeName}</option>
                              ))}
                            </select>
                          ) : (
                            <p className="px-3 py-2 bg-gray-50 forced-colors:bg-[Canvas] border border-gray-200 forced-colors:border-[CanvasText] rounded-md">
                              {vehicleTypes.find(t => t.id === vehicle.vehicleTypeId)?.typeName || 'N/A'}
                            </p>
                          )}
                          <AnimatePresence>
                            {errors.vehicleTypeId && (
                              <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-red-500 forced-colors:text-[CanvasText] text-xs flex items-center"
                              >
                                <AlertCircle size={12} className="mr-1" />
                                {errors.vehicleTypeId}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </motion.div>

                        <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 forced-colors:text-[CanvasText] mb-1">
                            Color
                          </label>
                          {isEditing ? (
                            <input
                              name="color"
                              value={editForm.color}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-300 forced-colors:border-[CanvasText] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 forced-colors:focus:border-[CanvasText]"
                              placeholder="e.g., Red"
                              disabled={isLoading}
                            />
                          ) : (
                            <p className="px-3 py-2 bg-gray-50 forced-colors:bg-[Canvas] border border-gray-200 forced-colors:border-[CanvasText] rounded-md">{vehicle.color}</p>
                          )}
                          <AnimatePresence>
                            {errors.color && (
                              <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-red-500 forced-colors:text-[CanvasText] text-xs flex items-center"
                              >
                                <AlertCircle size={12} className="mr-1" />
                                {errors.color}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </motion.div>

                        <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 forced-colors:text-[CanvasText] mb-1">
                            Brand
                          </label>
                          {isEditing ? (
                            <input
                              name="brand"
                              value={editForm.brand}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-300 forced-colors:border-[CanvasText] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 forced-colors:focus:border-[CanvasText]"
                              placeholder="e.g., Toyota"
                              disabled={isLoading}
                            />
                          ) : (
                            <p className="px-3 py-2 bg-gray-50 forced-colors:bg-[Canvas] border border-gray-200 forced-colors:border-[CanvasText] rounded-md">{vehicle.brand}</p>
                          )}
                          <AnimatePresence>
                            {errors.brand && (
                              <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-red-500 forced-colors:text-[CanvasText] text-xs flex items-center"
                              >
                                <AlertCircle size={12} className="mr-1" />
                                {errors.brand}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </motion.div>

                        {isEditing && (
                          <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 forced-colors:text-[CanvasText] mb-1">
                              Vehicle Image
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              id="vehicleImage"
                              onChange={handleImageChange}
                              className="hidden"
                              disabled={isLoading}
                            />
                            {editForm.image ? (
                              <div className="flex space-x-2 w-full">
                                <label
                                  htmlFor="vehicleImage"
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-teal-500 forced-colors:border-[CanvasText] text-sm font-medium text-teal-700 forced-colors:text-[CanvasText] bg-teal-50 forced-colors:bg-[Canvas] hover:bg-teal-100 forced-colors:hover:bg-[Canvas] hover:text-teal-800 forced-colors:hover:text-[CanvasText] transition-all rounded-md cursor-pointer"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v9m0-9l3 3m-3-3l-3 3m6-8V5a2 2 0 00-2-2H8a2 2 0 00-2 2v4" />
                                  </svg>
                                  <span>Choose another image</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setIsModalOpen(true)}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-500 forced-colors:border-[CanvasText] text-sm font-medium text-red-700 forced-colors:text-[CanvasText] bg-red-50 forced-colors:bg-[Canvas] hover:bg-red-100 forced-colors:hover:bg-[Canvas] hover:text-red-800 forced-colors:hover:text-[CanvasText] transition-all rounded-md"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h16M4 10h16M4 14h10M4 18h10" />
                                  </svg>
                                  <span>Preview image</span>
                                </button>
                              </div>
                            ) : (
                              <label
                                htmlFor="vehicleImage"
                                className={`flex items-center justify-center gap-2 w-full px-4 py-2 border border-teal-500 forced-colors:border-[CanvasText] text-sm font-medium text-teal-700 forced-colors:text-[CanvasText] bg-teal-50 forced-colors:bg-[Canvas] hover:bg-teal-100 forced-colors:hover:bg-[Canvas] hover:text-teal-800 forced-colors:hover:text-[CanvasText] transition-all rounded-md cursor-pointer ${
                                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v9m0-9l3 3m-3-3l-3 3m6-8V5a2 2 0 00-2-2H8a2 2 0 00-2 2v4" />
                                </svg>
                                <span>Choose image</span>
                              </label>
                            )}
                            <AnimatePresence>
                              {errors.image && (
                                <motion.p
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="text-red-500 forced-colors:text-[CanvasText] text-xs flex items-center"
                                >
                                  <AlertCircle size={12} className="mr-1" />
                                  {errors.image}
                                </motion.p>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* Vehicle Image */}
                  {!isEditing && (
                    <div className="lg:col-span-1">
                      <MemoizedImage />
                    </div>
                  )}
                </div>
              )}

              <AnimatePresence>
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="mt-4 p-3 bg-green-50 forced-colors:bg-[Canvas] border border-green-200 forced-colors:border-[CanvasText] text-green-800 forced-colors:text-[CanvasText] rounded-md flex items-center"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    <span>{successMessage}</span>
                  </motion.div>
                )}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="mt-4 p-3 bg-red-50 forced-colors:bg-[Canvas] border border-red-200 forced-colors:border-[CanvasText] text-red-800 forced-colors:text-[CanvasText] rounded-md flex items-center"
                  >
                    <AlertCircle size={16} className="mr-2" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {isModalOpen && previewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 forced-colors:bg-[Canvas] backdrop-blur-sm">
            <div className="relative max-w-7xl max-h-full bg-white forced-colors:bg-[Canvas] rounded-2xl shadow-2xl border border-blue-200/50 forced-colors:border-[CanvasText] p-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-white forced-colors:text-[CanvasText] hover:text-blue-300 forced-colors:hover:text-[CanvasText] transition-colors duration-300 bg-black/50 forced-colors:bg-[Canvas] rounded-full p-2"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={previewUrl}
                alt="Vehicle Image"
                className="max-w-full max-h-full object-contain rounded-xl border-2 border-blue-200/50 forced-colors:border-[CanvasText] shadow-2xl shadow-blue-400/40 forced-colors:shadow-none"
                onClick={() => setIsModalOpen(false)}
                onError={() => console.error('Failed to load preview image:', previewUrl)}
                onLoad={() => console.log('Preview image loaded successfully:', previewUrl)}
              />
            </div>
          </div>
        )}

        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 forced-colors:bg-[Canvas] flex items-center justify-center z-50 p-4">
            <div className="bg-white forced-colors:bg-[Canvas] rounded-lg shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center mb-4">
                <CheckCircle className="text-green-600 forced-colors:text-[CanvasText] mr-3" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 forced-colors:text-[CanvasText]">Confirm Save Changes</h3>
                  <p className="text-sm text-gray-600 forced-colors:text-[CanvasText]">Are you sure you want to save these changes?</p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 bg-gray-300 forced-colors:bg-[ButtonFace] text-gray-800 forced-colors:text-[CanvasText] rounded-md hover:bg-gray-400 forced-colors:hover:bg-[ButtonFace] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 forced-colors:bg-[ButtonFace] text-white forced-colors:text-[CanvasText] rounded-md hover:bg-green-700 forced-colors:hover:bg-[ButtonFace] transition-colors disabled:opacity-50 flex items-center space-x-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white forced-colors:border-[CanvasText]"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Confirm</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 forced-colors:bg-[Canvas] flex items-center justify-center z-50 p-4">
            <div className="bg-white forced-colors:bg-[Canvas] rounded-lg shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center mb-4">
                <AlertCircle className="text-red-600 forced-colors:text-[CanvasText] mr-3" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 forced-colors:text-[CanvasText]">Confirm Vehicle Deletion</h3>
                  <p className="text-sm text-gray-600 forced-colors:text-[CanvasText]">This action cannot be undone. Are you sure?</p>
                </div>
              </div>
              <div className="bg-red-50 forced-colors:bg-[Canvas] border border-red-200 forced-colors:border-[CanvasText] rounded-md p-3 mb-4">
                <p className="text-red-700 forced-colors:text-[CanvasText] text-sm">
                  ⚠️ The vehicle will be permanently deleted from the system
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-300 forced-colors:bg-[ButtonFace] text-gray-800 forced-colors:text-[CanvasText] rounded-md hover:bg-gray-400 forced-colors:hover:bg-[ButtonFace] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 forced-colors:bg-[ButtonFace] text-white forced-colors:text-[CanvasText] rounded-md hover:bg-red-700 forced-colors:hover:bg-[ButtonFace] transition-colors disabled:opacity-50 flex items-center space-x-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white forced-colors:border-[CanvasText]"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VehicleDetail
