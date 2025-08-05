import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { Pencil, Trash2, Save, X, Car, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
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
  image?: string
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
  const [editForm, setEditForm] = useState({
    name: '',
    licensePlate: '',
    userId: '',
    vehicleTypeId: '',
    color: '',
    brand: '',
    image: null as File | null
  })

  // Fetch vehicle types
  useEffect(() => {
    const fetchVehicleTypes = async () => {
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
    }
    fetchVehicleTypes()
  }, [])

  // Fetch vehicles
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

  // Fetch vehicle details
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
          brand: data.brand || '',
          image: null
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEditForm(prev => ({ ...prev, image: file }))
      setErrors(prev => ({ ...prev, image: '' }))
      const imageUrl = URL.createObjectURL(file)
      setPreviewUrl(imageUrl)
      setIsModalOpen(true)
    }
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    setSuccessMessage('')
    setErrorMessage('')
    try {
      const formData = new FormData()
      const vehicleDTO = {
        name: editForm.name,
        licensePlate: editForm.licensePlate,
        userId: parseInt(editForm.userId),
        vehicleTypeId: parseInt(editForm.vehicleTypeId),
        color: editForm.color,
        brand: editForm.brand
      }
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
      setVehicle(updatedData)
      setVehicles(prev => prev.map(v => v.id === Number(id) ? updatedData : v))
      setSuccessMessage(`Vehicle ${updatedData.licensePlate} updated successfully!`)
      setIsEditing(false)
      setShowConfirm(false)
      setPreviewUrl(null)
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
        brand: vehicle.brand,
        image: null
      })
      setPreviewUrl(null)
    }
    setErrors({})
  }

  if (!vehicle && id !== '0') {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-col flex-grow">
          <Header title="Chi tiết Phương Tiện" />
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải dữ liệu...</p>
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-grow">
        <Header title={id === '0' ? 'Chọn Phương Tiện để Chỉnh Sửa' : `Chi tiết Phương Tiện #${id}`} />
        
        <div className="p-6 overflow-y-auto">
          <button
            onClick={() => navigate('/vehicle')}
            className="mb-6 flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Quay lại danh sách</span>
          </button>

          <div className="bg-white shadow rounded-lg overflow-hidden max-w-4xl mx-auto">
            <div className="bg-blue-600 p-6 text-white">
              <div className="flex items-center space-x-3">
                <Car size={24} />
                <div>
                  <h1 className="text-xl font-bold">Quản lý Phương Tiện</h1>
                  <p className="text-blue-100">Thông tin chi tiết và chỉnh sửa</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn Phương Tiện
                </label>
                <select
                  value={id || '0'}
                  onChange={(e) => navigate(`/vehicle/edit/${e.target.value}`)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                >
                  <option value="0">Chọn một phương tiện để xem chi tiết</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} - {v.name} ({v.brand})
                    </option>
                  ))}
                </select>
              </div>

              {id !== '0' && vehicle && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">
                      Thông tin Phương Tiện
                    </h2>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Pencil size={16} />
                        <span>Chỉnh sửa</span>
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowConfirm(true)}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                          disabled={isLoading}
                        >
                          <Save size={16} />
                          <span>Lưu</span>
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                        >
                          <X size={16} />
                          <span>Hủy</span>
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                          disabled={isLoading}
                        >
                          <Trash2 size={16} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tên Phương Tiện
                      </label>
                      {isEditing ? (
                        <input
                          name="name"
                          value={editForm.name}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Toyota Camry"
                          disabled={isLoading}
                        />
                      ) : (
                        <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">{vehicle.name}</p>
                      )}
                      <AnimatePresence>
                        {errors.name && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-red-500 text-xs flex items-center"
                          >
                            <AlertCircle size={12} className="mr-1" />
                            {errors.name}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Biển Số
                      </label>
                      {isEditing ? (
                        <input
                          name="licensePlate"
                          value={editForm.licensePlate}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono font-bold"
                          placeholder="e.g., 30A-12345"
                          disabled={isLoading}
                        />
                      ) : (
                        <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md font-mono font-bold">{vehicle.licensePlate}</p>
                      )}
                      <AnimatePresence>
                        {errors.licensePlate && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-red-500 text-xs flex items-center"
                          >
                            <AlertCircle size={12} className="mr-1" />
                            {errors.licensePlate}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User ID
                      </label>
                      {isEditing ? (
                        <input
                          name="userId"
                          type="text"
                          value={editForm.userId}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., 123"
                          disabled={isLoading}
                        />
                      ) : (
                        <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">#{vehicle.userId}</p>
                      )}
                      <AnimatePresence>
                        {errors.userId && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-red-500 text-xs flex items-center"
                          >
                            <AlertCircle size={12} className="mr-1" />
                            {errors.userId}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Loại Xe
                      </label>
                      {isEditing ? (
                        <select
                          name="vehicleTypeId"
                          value={editForm.vehicleTypeId}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={isLoading}
                        >
                          <option value="">Chọn loại xe</option>
                          {vehicleTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.typeName}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                          {vehicleTypes.find(t => t.id === vehicle.vehicleTypeId)?.typeName || 'N/A'}
                        </p>
                      )}
                      <AnimatePresence>
                        {errors.vehicleTypeId && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-red-500 text-xs flex items-center"
                          >
                            <AlertCircle size={12} className="mr-1" />
                            {errors.vehicleTypeId}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Màu Sắc
                      </label>
                      {isEditing ? (
                        <input
                          name="color"
                          value={editForm.color}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Red"
                          disabled={isLoading}
                        />
                      ) : (
                        <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">{vehicle.color}</p>
                      )}
                      <AnimatePresence>
                        {errors.color && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-red-500 text-xs flex items-center"
                          >
                            <AlertCircle size={12} className="mr-1" />
                            {errors.color}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hãng
                      </label>
                      {isEditing ? (
                        <input
                          name="brand"
                          value={editForm.brand}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Toyota"
                          disabled={isLoading}
                        />
                      ) : (
                        <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">{vehicle.brand}</p>
                      )}
                      <AnimatePresence>
                        {errors.brand && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-red-500 text-xs flex items-center"
                          >
                            <AlertCircle size={12} className="mr-1" />
                            {errors.brand}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {isEditing && (
                      <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hình Ảnh Phương Tiện
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
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-teal-500 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 hover:text-teal-800 transition-all rounded-md cursor-pointer"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v9m0-9l3 3m-3-3l-3 3m6-8V5a2 2 0 00-2-2H8a2 2 0 00-2 2v4" />
                              </svg>
                              <span>Chọn ảnh khác</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsModalOpen(true)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-500 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 transition-all rounded-md"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h16M4 10h16M4 14h10M4 18h10" />
                              </svg>
                              <span>Xem trước ảnh</span>
                            </button>
                          </div>
                        ) : (
                          <label
                            htmlFor="vehicleImage"
                            className={`flex items-center justify-center gap-2 w-full px-4 py-2 border border-teal-500 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 hover:text-teal-800 transition-all rounded-md cursor-pointer ${
                              isLoading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v9m0-9l3 3m-3-3l-3 3m6-8V5a2 2 0 00-2-2H8a2 2 0 00-2 2v4" />
                            </svg>
                            <span>Chọn ảnh</span>
                          </label>
                        )}
                        <AnimatePresence>
                          {errors.image && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="text-red-500 text-xs flex items-center"
                            >
                              <AlertCircle size={12} className="mr-1" />
                              {errors.image}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </div>

                  {isModalOpen && previewUrl && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                      <div className="relative w-[90%] max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 transition-all duration-300">
                        <button
                          onClick={() => setIsModalOpen(false)}
                          className="absolute top-3 right-3 text-gray-500 hover:text-red-500 transition-colors duration-200"
                          aria-label="Close"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="w-full h-[300px] flex items-center justify-center rounded-xl overflow-hidden bg-gray-50">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-w-full max-h-full object-contain rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <AnimatePresence>
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="mt-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md flex items-center"
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
                    className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md flex items-center"
                  >
                    <AlertCircle size={16} className="mr-2" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center mb-4">
                <CheckCircle className="text-green-600 mr-3" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Xác nhận lưu thay đổi</h3>
                  <p className="text-sm text-gray-600">Bạn có chắc chắn muốn lưu các thay đổi này?</p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Xác nhận</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center mb-4">
                <AlertCircle className="text-red-600 mr-3" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Xác nhận xóa phương tiện</h3>
                  <p className="text-sm text-gray-600">Hành động này không thể hoàn tác. Bạn có chắc chắn?</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-red-700 text-sm">
                  ⚠️ Phương tiện sẽ bị xóa vĩnh viễn khỏi hệ thống
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>Xác nhận xóa</span>
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
