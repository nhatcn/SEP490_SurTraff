import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { Pencil, Trash2, Save, X, Car, User, Palette, Tag, Hash, Settings, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import Sidebar from '../../../components/Layout/Sidebar'
import Header from '../../../components/Layout/Header'

interface VehicleType {
  id: number
  typeName: string
}

interface Vehicle {
  id: number
  name: string
  licensePlate: string
  userId: number
  vehicleTypeId: number
  color: string
  brand: string
}

interface FormErrors {
  name?: string
  licensePlate?: string
  userId?: string
  vehicleTypeId?: string
  color?: string
  brand?: string
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
  const [editForm, setEditForm] = useState({
    name: '',
    licensePlate: '',
    userId: '',
    vehicleTypeId: '',
    color: '',
    brand: ''
  })

  // Load vehicle types
  useEffect(() => {
    const fetchVehicleTypes = async () => {
      try {
        const response = await fetch('http://localhost:8081/api/vehicle/types', {
          headers: { 'Content-Type': 'application/json' }
        })
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
        const data: VehicleType[] = await response.json()
        setVehicleTypes(data)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        setErrorMessage(`Error loading vehicle types: ${message}`)
      }
    }
    fetchVehicleTypes()
  }, [])

  // Load vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
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
    }
    fetchVehicles()
  }, [])

  // Load vehicle detail
  useEffect(() => {
    const fetchVehicle = async () => {
      if (!id || id === '0') return
      setIsLoading(true)
      try {
        const response = await fetch(`http://localhost:8081/api/vehicle/${id}`, {
          headers: { 'Content-Type': 'application/json' }
        })
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
        const data: Vehicle = await response.json()
        setVehicle(data)
        setEditForm({
          name: data.name || '',
          licensePlate: data.licensePlate || '',
          userId: data.userId ? data.userId.toString() : '',
          vehicleTypeId: data.vehicleTypeId ? data.vehicleTypeId.toString() : '',
          color: data.color || '',
          brand: data.brand || ''
        })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        setErrorMessage(`Error loading vehicle: ${message}`)
      } finally {
        setIsLoading(false)
      }
    }
    fetchVehicle()
  }, [id])

  const validateForm = () => {
    const newErrors: FormErrors = {}
    const plateRegex = /^\d{2}[A-Z]{1,2}-\d{4,5}$/
    const colorRegex = /^[a-zA-Z\s]+$/
    const numberRegex = /^\d+$/

    if (!editForm.name) newErrors.name = 'Vehicle name is required'
    if (!editForm.licensePlate) {
      newErrors.licensePlate = 'License plate is required'
    } else if (!plateRegex.test(editForm.licensePlate)) {
      newErrors.licensePlate = 'Invalid format (e.g., 30A-12345 or 30AB-12345)'
    } else if (
      vehicles.some(v => v.licensePlate === editForm.licensePlate && v.id !== Number(id))
    ) {
      newErrors.licensePlate = 'License plate already exists'
    }
    if (!editForm.userId) {
      newErrors.userId = 'User ID is required'
    } else if (!numberRegex.test(editForm.userId)) {
      newErrors.userId = 'User ID must be a number'
    }
    if (!editForm.vehicleTypeId) newErrors.vehicleTypeId = 'Vehicle type is required'
    if (!editForm.color) {
      newErrors.color = 'Color is required'
    } else if (!colorRegex.test(editForm.color)) {
      newErrors.color = 'Color must contain only letters and spaces'
    }
    if (!editForm.brand) newErrors.brand = 'Brand is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    setSuccessMessage('')
    setErrorMessage('')
    try {
      const response = await fetch(`http://localhost:8081/api/vehicle/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          userId: parseInt(editForm.userId),
          vehicleTypeId: parseInt(editForm.vehicleTypeId)
        })
      })
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
      const updatedData: Vehicle = await response.json()
      setVehicle(updatedData)
      setVehicles(prev => prev.map(v => v.id === Number(id) ? updatedData : v))
      setSuccessMessage(`Vehicle ${updatedData.licensePlate} updated successfully!`)
      setIsEditing(false)
      setShowConfirm(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(`Error updating vehicle: ${message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
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
  }

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
        userId: vehicle.userId.toString(),
        vehicleTypeId: vehicle.vehicleTypeId.toString(),
        color: vehicle.color,
        brand: vehicle.brand
      })
    }
    setErrors({})
  }

  if (!vehicle && id !== '0') {
    return (
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Sidebar />
        <div className="flex flex-col flex-grow">
          <Header title="Vehicle Detail" />
          <div className="flex items-center justify-center h-full">
            <motion.div
              className="flex flex-col items-center space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <motion.div
                className="flex space-x-2"
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" />
                <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-full" />
                <div className="w-4 h-4 bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-full" />
              </motion.div>
              <p className="text-gray-600 font-medium">Loading data...</p>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-grow">
        <Header title={id === '0' ? 'Select a Vehicle to Edit' : `Vehicle Detail`} />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 overflow-y-auto"
        >
          {/* Back Button */}
          <motion.button
            onClick={() => navigate('/vehicle')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mb-6 flex items-center space-x-2 text-gray-600 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Vehicles</span>
          </motion.button>

          <div className="bg-white shadow-xl rounded-3xl overflow-hidden max-w-4xl mx-auto">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-white/20 rounded-full">
                    <Car size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Vehicle Management</h1>
                    <p className="text-emerald-100">Detail information and editing</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* Vehicle Selector */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <Settings className="inline mr-2" size={16} />
                  Select Vehicle
                </label>
                <select
                  value={id || '0'}
                  onChange={(e) => navigate(`/vehicle/edit/${e.target.value}`)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 disabled:opacity-50 bg-gray-50"
                  disabled={isLoading}
                >
                  <option value="0">Select a vehicle to view details</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} - {v.name} ({v.brand})
                    </option>
                  ))}
                </select>
              </div>

              {id !== '0' && vehicle && (
                <>
                  {/* Action Buttons */}
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                      <Hash className="mr-2" size={24} />
                      Vehicle Information
                    </h2>
                    {!isEditing ? (
                      <motion.button
                        onClick={() => setIsEditing(true)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <Pencil size={18} />
                        <span>Edit</span>
                      </motion.button>
                    ) : (
                      <div className="flex space-x-3">
                        <motion.button
                          onClick={() => setShowConfirm(true)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                          disabled={isLoading}
                        >
                          <Save size={18} />
                          <span>Save</span>
                        </motion.button>
                        <motion.button
                          onClick={handleCancel}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl hover:from-gray-500 hover:to-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <X size={18} />
                          <span>Cancel</span>
                        </motion.button>
                        <motion.button
                          onClick={() => setShowDeleteConfirm(true)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                          disabled={isLoading}
                        >
                          <Trash2 size={18} />
                          <span>Delete</span>
                        </motion.button>
                      </div>
                    )}
                  </div>

                  {/* Vehicle Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Vehicle Name */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200"
                    >
                      <label className="flex items-center text-sm font-semibold text-blue-800 mb-3">
                        <Car className="mr-2" size={16} />
                        Vehicle Name
                      </label>
                      {isEditing ? (
                        <input
                          name="name"
                          value={editForm.name}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:opacity-50"
                          placeholder="e.g., Toyota Camry"
                          disabled={isLoading}
                        />
                      ) : (
                        <p className="text-blue-700 font-medium text-lg">{vehicle.name}</p>
                      )}
                      {errors.name && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-red-500 text-xs mt-2 flex items-center"
                        >
                          <AlertCircle size={14} className="mr-1" />
                          {errors.name}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* License Plate */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200"
                    >
                      <label className="flex items-center text-sm font-semibold text-purple-800 mb-3">
                        <Tag className="mr-2" size={16} />
                        License Plate
                      </label>
                      {isEditing ? (
                        <input
                          name="licensePlate"
                          value={editForm.licensePlate}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 disabled:opacity-50"
                          placeholder="e.g., 30A-12345"
                          disabled={isLoading}
                        />
                      ) : (
                        <p className="text-purple-700 font-bold text-lg font-mono bg-white px-3 py-2 rounded-lg border-2 border-purple-200">
                          {vehicle.licensePlate}
                        </p>
                      )}
                      {errors.licensePlate && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-red-500 text-xs mt-2 flex items-center"
                        >
                          <AlertCircle size={14} className="mr-1" />
                          {errors.licensePlate}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* User ID */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200"
                    >
                      <label className="flex items-center text-sm font-semibold text-green-800 mb-3">
                        <User className="mr-2" size={16} />
                        User ID
                      </label>
                      {isEditing ? (
                        <input
                          name="userId"
                          type="text"
                          value={editForm.userId}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-green-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 disabled:opacity-50"
                          placeholder="e.g., 123"
                          disabled={isLoading}
                        />
                      ) : (
                        <p className="text-green-700 font-medium text-lg">#{vehicle.userId}</p>
                      )}
                      {errors.userId && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-red-500 text-xs mt-2 flex items-center"
                        >
                          <AlertCircle size={14} className="mr-1" />
                          {errors.userId}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Vehicle Type */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200"
                    >
                      <label className="flex items-center text-sm font-semibold text-orange-800 mb-3">
                        <Settings className="mr-2" size={16} />
                        Vehicle Type
                      </label>
                      {isEditing ? (
                        <select
                          name="vehicleTypeId"
                          value={editForm.vehicleTypeId}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 disabled:opacity-50"
                          disabled={isLoading}
                        >
                          <option value="">Select vehicle type</option>
                          {vehicleTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.typeName}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-orange-700 font-medium text-lg">
                          {vehicleTypes.find(t => t.id === vehicle.vehicleTypeId)?.typeName || 'N/A'}
                        </p>
                      )}
                      {errors.vehicleTypeId && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-red-500 text-xs mt-2 flex items-center"
                        >
                          <AlertCircle size={14} className="mr-1" />
                          {errors.vehicleTypeId}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Color */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border border-pink-200"
                    >
                      <label className="flex items-center text-sm font-semibold text-pink-800 mb-3">
                        <Palette className="mr-2" size={16} />
                        Color
                      </label>
                      {isEditing ? (
                        <input
                          name="color"
                          value={editForm.color}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-pink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 disabled:opacity-50"
                          placeholder="e.g., Red"
                          disabled={isLoading}
                        />
                      ) : (
                        <p className="text-pink-700 font-medium text-lg">{vehicle.color}</p>
                      )}
                      {errors.color && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-red-500 text-xs mt-2 flex items-center"
                        >
                          <AlertCircle size={14} className="mr-1" />
                          {errors.color}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Brand */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200"
                    >
                      <label className="flex items-center text-sm font-semibold text-indigo-800 mb-3">
                        <Tag className="mr-2" size={16} />
                        Brand
                      </label>
                      {isEditing ? (
                        <input
                          name="brand"
                          value={editForm.brand}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 disabled:opacity-50"
                          placeholder="e.g., Toyota"
                          disabled={isLoading}
                        />
                      ) : (
                        <p className="text-indigo-700 font-medium text-lg">{vehicle.brand}</p>
                      )}
                      {errors.brand && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-red-500 text-xs mt-2 flex items-center"
                        >
                          <AlertCircle size={14} className="mr-1" />
                          {errors.brand}
                        </motion.p>
                      )}
                    </motion.div>
                  </div>
                </>
              )}

              {/* Messages */}
              <AnimatePresence>
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="mt-6 p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 text-green-800 rounded-xl flex items-center shadow-md"
                  >
                    <CheckCircle size={20} className="mr-3 text-green-600" />
                    <span className="font-medium">{successMessage}</span>
                  </motion.div>
                )}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="mt-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-800 rounded-xl flex items-center shadow-md"
                  >
                    <AlertCircle size={20} className="mr-3 text-red-600" />
                    <span className="font-medium">{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {showConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-emerald-100 rounded-full mr-4">
                    <CheckCircle className="text-emerald-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Confirm Save Changes</h3>
                    <p className="text-sm text-gray-600">Are you sure you want to save these changes?</p>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <motion.button
                    onClick={() => setShowConfirm(false)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleSave}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Confirm</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-red-100 rounded-full mr-4">
                    <AlertCircle className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Confirm Delete Vehicle</h3>
                    <p className="text-sm text-gray-600">This action cannot be undone. Are you sure?</p>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-700 text-sm font-medium">
                    ⚠️ The vehicle will be permanently deleted from the system
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <motion.button
                    onClick={() => setShowDeleteConfirm(false)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleDelete}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        <span>Confirm Delete</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default VehicleDetail