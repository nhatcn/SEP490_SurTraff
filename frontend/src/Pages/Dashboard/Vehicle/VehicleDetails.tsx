import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { Pencil, Trash2, Save, X, Car, User, Settings, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
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

  // Tải danh sách loại xe
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

  // Tải danh sách phương tiện
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

  // Tải thông tin phương tiện
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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-grow">
        <Header title={id === '0' ? 'Chọn Phương Tiện để Chỉnh Sửa' : `Chi tiết Phương Tiện #${id}`} />
        
        <div className="p-6 overflow-y-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/vehicle')}
            className="mb-6 flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Quay lại danh sách</span>
          </button>

          <div className="bg-white shadow rounded-lg overflow-hidden max-w-4xl mx-auto">
            {/* Header */}
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
              {/* Vehicle Selector */}
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
                  {/* Action Buttons */}
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

                  {/* Vehicle Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vehicle Name */}
                    <div>
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
                      {errors.name && (
                        <p className="text-red-500 text-xs mt-1 flex items-center">
                          <AlertCircle size={12} className="mr-1" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    {/* License Plate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Biển Số
                      </label>
                      {isEditing ? (
                        <input
                          name="licensePlate"
                          value={editForm.licensePlate}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., 30A-12345"
                          disabled={isLoading}
                        />
                      ) : (
                        <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md font-mono font-bold">
                          {vehicle.licensePlate}
                        </p>
                      )}
                      {errors.licensePlate && (
                        <p className="text-red-500 text-xs mt-1 flex items-center">
                          <AlertCircle size={12} className="mr-1" />
                          {errors.licensePlate}
                        </p>
                      )}
                    </div>

                    {/* User ID */}
                    <div>
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
                      {errors.userId && (
                        <p className="text-red-500 text-xs mt-1 flex items-center">
                          <AlertCircle size={12} className="mr-1" />
                          {errors.userId}
                        </p>
                      )}
                    </div>

                    {/* Vehicle Type */}
                    <div>
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
                      {errors.vehicleTypeId && (
                        <p className="text-red-500 text-xs mt-1 flex items-center">
                          <AlertCircle size={12} className="mr-1" />
                          {errors.vehicleTypeId}
                        </p>
                      )}
                    </div>

                    {/* Color */}
                    <div>
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
                      {errors.color && (
                        <p className="text-red-500 text-xs mt-1 flex items-center">
                          <AlertCircle size={12} className="mr-1" />
                          {errors.color}
                        </p>
                      )}
                    </div>

                    {/* Brand */}
                    <div>
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
                      {errors.brand && (
                        <p className="text-red-500 text-xs mt-1 flex items-center">
                          <AlertCircle size={12} className="mr-1" />
                          {errors.brand}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Messages */}
              {successMessage && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md flex items-center">
                  <CheckCircle size={16} className="mr-2" />
                  <span>{successMessage}</span>
                </div>
              )}
              {errorMessage && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md flex items-center">
                  <AlertCircle size={16} className="mr-2" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
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

        {/* Delete Confirmation Modal */}
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