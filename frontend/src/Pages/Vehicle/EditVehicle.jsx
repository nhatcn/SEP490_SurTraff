import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'

const EditVehicle = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    licensePlate: '',
    userId: '',
    vehicleTypeId: '',
    color: '',
    brand: ''
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [existingPlates, setExistingPlates] = useState([])

  // Tải danh sách loại xe
  useEffect(() => {
    const fetchVehicleTypes = async () => {
      try {
        const response = await fetch('http://localhost:8081/api/vehicle-types', {
          headers: { 'Content-Type': 'application/json' }
        })
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
        const data = await response.json()
        setVehicleTypes(data)
      } catch (error) {
        setErrorMessage(`Error loading vehicle types: ${error.message}`)
      }
    }
    fetchVehicleTypes()
  }, [])

  // Tải danh sách phương tiện
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch('http://localhost:8081/api/vehicle', {
          headers: { 'Content-Type': 'application/json' }
        })
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
        const data = await response.json()
        setVehicles(data)
        setExistingPlates(data.map(vehicle => vehicle.licensePlate))
      } catch (error) {
        setErrorMessage(`Error loading vehicles: ${error.message}`)
      }
    }
    fetchVehicles()
  }, [])

  // Tải thông tin phương tiện
  useEffect(() => {
    const fetchVehicle = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`http://localhost:8081/api/vehicle/${id}`, {
          headers: { 'Content-Type': 'application/json' }
        })
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
        const data = await response.json()
        setFormData({
          name: data.name || '',
          licensePlate: data.licensePlate || '',
          userId: data.userId ? data.userId.toString() : '',
          vehicleTypeId: data.vehicleTypeId ? data.vehicleTypeId.toString() : '',
          color: data.color || '',
          brand: data.brand || ''
        })
      } catch (error) {
        setErrorMessage(`Error loading vehicle: ${error.message}`)
      } finally {
        setIsLoading(false)
      }
    }
    if (id && id !== '0') fetchVehicle()
  }, [id])

  const validateForm = () => {
    const newErrors = {}
    const plateRegex = /^\d{2}[A-Z]{1,2}-\d{4,5}$/
    const colorRegex = /^[a-zA-Z\s]+$/
    const numberRegex = /^\d+$/

    if (!formData.name) newErrors.name = 'Vehicle name is required'
    if (!formData.licensePlate) {
      newErrors.licensePlate = 'License plate is required'
    } else if (!plateRegex.test(formData.licensePlate)) {
      newErrors.licensePlate = 'Invalid format (e.g., 30A-12345 or 30AB-12345)'
    } else if (existingPlates.includes(formData.licensePlate) && formData.licensePlate !== vehicles.find(v => v.id === parseInt(id))?.licensePlate) {
      newErrors.licensePlate = 'License plate already exists'
    }
    if (!formData.userId) {
      newErrors.userId = 'User ID is required'
    } else if (!numberRegex.test(formData.userId)) {
      newErrors.userId = 'User ID must be a number'
    }
    if (!formData.vehicleTypeId) newErrors.vehicleTypeId = 'Vehicle type is required'
    if (!formData.color) {
      newErrors.color = 'Color is required'
    } else if (!colorRegex.test(formData.color)) {
      newErrors.color = 'Color must contain only letters and spaces'
    }
    if (!formData.brand) newErrors.brand = 'Brand is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccessMessage('')
    setErrorMessage('')

    if (!validateForm()) return

    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:8081/api/vehicle/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId: parseInt(formData.userId),
          vehicleTypeId: parseInt(formData.vehicleTypeId)
        })
      })
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
      const data = await response.json()
      setSuccessMessage(`Vehicle ${data.licensePlate} updated successfully!`)
      setVehicles(prev => prev.map(v => v.id === parseInt(id) ? data : v))
      setExistingPlates(prev => prev.map(p => p === vehicles.find(v => v.id === parseInt(id))?.licensePlate ? data.licensePlate : p))
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return
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
      setFormData({ name: '', licensePlate: '', userId: '', vehicleTypeId: '', color: '', brand: '' })
      setVehicles(prev => prev.filter(v => v.id !== parseInt(id)))
      setExistingPlates(prev => prev.filter(p => p !== formData.licensePlate))
      setTimeout(() => navigate('/vehicle/add'), 2000)
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow-2xl border border-gray-100"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <svg className="h-6 w-6 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit Vehicle
      </h2>

      {/* Danh sách phương tiện */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Vehicle to Edit</label>
        <select
          value={id || '0'}
          onChange={(e) => navigate(`/vehicle/edit/${e.target.value}`)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          disabled={isLoading}
        >
          <option value="0">Select a vehicle</option>
          {vehicles.map(vehicle => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.licensePlate} - {vehicle.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && !formData.licensePlate && id !== '0' && (
        <div className="flex justify-center items-center py-4">
          <motion.div
            className="w-2 h-2 bg-emerald-500 rounded-full mr-1"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 bg-emerald-500 rounded-full mr-1"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 bg-emerald-500 rounded-full"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      )}

      {id !== '0' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Toyota Camry"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
            <input
              type="text"
              name="licensePlate"
              value={formData.licensePlate}
              onChange={handleChange}
              placeholder="e.g., 30A-12345"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            />
            {errors.licensePlate && <p className="text-red-500 text-xs mt-1">{errors.licensePlate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input
              type="text"
              name="userId"
              value={formData.userId}
              onChange={handleChange}
              placeholder="e.g., 123"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            />
            {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
            <select
              name="vehicleTypeId"
              value={formData.vehicleTypeId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            >
              <option value="">Select type</option>
              {vehicleTypes.map(type => (
                <option key={type.id} value={type.id}>{type.typeName}</option>
              ))}
            </select>
            {errors.vehicleTypeId && <p className="text-red-500 text-xs mt-1">{errors.vehicleTypeId}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleChange}
              placeholder="e.g., Red"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            />
            {errors.color && <p className="text-red-500 text-xs mt-1">{errors.color}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="e.g., Toyota"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            />
            {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand}</p>}
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <motion.div
                  className="w-2 h-2 bg-white rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-white rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-white rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            ) : (
              'Update Vehicle'
            )}
          </motion.button>

          <motion.button
            onClick={handleDelete}
            disabled={isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-2"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <motion.div
                  className="w-2 h-2 bg-white rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-white rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-white rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            ) : (
              'Delete Vehicle'
            )}
          </motion.button>
        </form>
      )}

      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg text-sm"
          >
            {successMessage}
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm"
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default EditVehicle
