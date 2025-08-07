'use client'

import type React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Car,
  Search,
  X,
  ArrowLeft,
  Bot,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  PlusCircle,
  Edit,
  Eye,
  RefreshCw
} from 'lucide-react'
import { getCookie } from '../../utils/cookieUltil'
import { Header, MobileDropdownMenu } from '../../components/Layout/Menu'
import Footer from '../../components/Layout/Footer'

interface VehicleDTO {
  id: number
  name: string
  licensePlate: string
  userId: number
  vehicleTypeId: number
  color: string
  brand: string
  image: string
  isDelete: boolean
}

interface ViolationDetail {
  id: number
  violationId: number
  violationTypeId: number
  violationType: {
    id: number
    typeName: string
    description: string
  }
  imageUrl: string
  videoUrl: string
  location: string
  violationTime?: string
  speed: number
  additionalNotes: string
  createdAt: string
  licensePlate: string
}

interface ViolationData {
  id: number
  camera: {
    id: number
    name: string
    location: string
    streamUrl: string
    thumbnail: string
    zoneId: number
    latitude: number
    longitude: number
  }
  vehicleType: {
    id: number
    typeName: string
  }
  vehicle: {
    id: number
    name: string
    licensePlate: string
    userId: number
    vehicleTypeId: number
    color: string
    brand: string
  }
  createdAt: string
  violationDetails: ViolationDetail[]
  status: string
}

interface VehicleCustomerListProps {
  userId?: number
  onBack?: () => void
}

const VehicleCustomerList: React.FC<VehicleCustomerListProps> = ({
  onBack
}) => {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<VehicleDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [violations, setViolations] = useState<{
    [key: string]: ViolationData[]
  }>({})
  const [robotMessage, setRobotMessage] = useState('')
  const [robotMessageType, setRobotMessageType] = useState<
    'info' | 'success' | 'warning' | 'error'
  >('info')
  const [showRobotMessage, setShowRobotMessage] = useState(false)
  const [robotIsChecking, setRobotIsChecking] = useState(false)
  const [firstViolatedPlate, setFirstViolatedPlate] = useState<string | null>(
    null
  )
  const [userId, setUserId] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const API_URL = 'http://localhost:8081'

  // Fetch userId from cookie or localStorage
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true)
      try {
        const cookieUserId = getCookie('userId')
        if (!cookieUserId) {
          setError('No user ID found in cookies')
          setIsLoading(false)
          return
        }

        const response = await fetch(`${API_URL}/api/users/${cookieUserId}`)
        if (response.ok) {
          const user = await response.json()
          setUserId(user.userId.toString())
        } else {
          const localStorageUserId = localStorage.getItem('userId')
          if (localStorageUserId) {
            setUserId(localStorageUserId)
            setError('Failed to fetch user data, using localStorage userId')
          } else {
            setError('No user ID found')
          }
        }
      } catch (error) {
        console.error(`Error fetching user data: ${getCookie('userId')}`, error)
        const localStorageUserId = localStorage.getItem('userId')
        if (localStorageUserId) {
          setUserId(localStorageUserId)
          setError('Error fetching user data, using localStorage userId')
        } else {
          setError('Error fetching user data')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [API_URL])

  // Load vehicles list
  const loadVehicles = useCallback(async () => {
    if (!userId) {
      setError('No user ID available to load vehicles')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/vehicle/user/${userId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('No vehicles found for this user.')
        } else {
          setError('An error occurred while loading the vehicles list.')
        }
        return
      }
      const data: VehicleDTO[] = await response.json()
      setVehicles(data)
      checkAllVehicleViolations(data)
    } catch (err) {
      setError('An error occurred while loading the vehicles list.')
    } finally {
      setIsLoading(false)
    }
  }, [API_URL, userId])

  // Check violations for a specific license plate
  const checkViolations = useCallback(
    async (licensePlate: string) => {
      try {
        const response = await fetch(
          `${API_URL}/api/violations/license-plate/${licensePlate}`
        )
        if (response.ok) {
          const violationData: ViolationData[] = await response.json()
          setViolations(prev => ({
            ...prev,
            [licensePlate]: violationData
          }))
          return violationData
        }
        return []
      } catch (err) {
        console.error(`Error checking violations for ${licensePlate}:`, err)
        return []
      }
    },
    [API_URL]
  )

  // Check violations for all vehicles and show robot message
  const checkAllVehicleViolations = useCallback(
    async (vehicleList: VehicleDTO[]) => {
      setRobotIsChecking(true)
      setRobotMessage('Checking violations for all vehicles...')
      setRobotMessageType('info')
      setShowRobotMessage(true)
      setFirstViolatedPlate(null)

      const violationPromises = vehicleList
        .filter(vehicle => !vehicle.isDelete)
        .map(vehicle => checkViolations(vehicle.licensePlate))

      try {
        const allViolations = await Promise.all(violationPromises)

        let totalViolations = 0
        let foundFirstViolated = false
        const violatedVehiclesCount = allViolations.filter((v, index) => {
          if (v.length > 0) {
            totalViolations += v.length
            if (!foundFirstViolated) {
              setFirstViolatedPlate(
                vehicleList.filter(v => !v.isDelete)[index].licensePlate
              )
              foundFirstViolated = true
            }
            return true
          }
          return false
        }).length

        setTimeout(() => {
          if (totalViolations === 0) {
            setRobotMessage('Great! All your vehicles have no violations!')
            setRobotMessageType('success')
          } else if (violatedVehiclesCount === 1) {
            setRobotMessage(
              `Vehicle ${firstViolatedPlate} has violations. Please check!`
            )
            setRobotMessageType('warning')
          } else {
            setRobotMessage(
              `There are ${violatedVehiclesCount} vehicles with violations. Please check the list below for details.`
            )
            setRobotMessageType('warning')
          }
          setRobotIsChecking(false)

          setTimeout(() => {
            setShowRobotMessage(false)
          }, 8000)
        }, 2000)
      } catch (err) {
        setTimeout(() => {
          setRobotMessage('Could not check violations. Please try again later!')
          setRobotMessageType('error')
          setRobotIsChecking(false)
          setTimeout(() => {
            setShowRobotMessage(false)
          }, 5000)
        }, 1000)
      }
    },
    [checkViolations, firstViolatedPlate]
  )

  // Manual check violations
  const handleRobotClick = useCallback(() => {
    if (vehicles.length > 0 && !robotIsChecking) {
      checkAllVehicleViolations(vehicles)
    }
  }, [vehicles, robotIsChecking, checkAllVehicleViolations])

  // Activate a deleted vehicle
  const handleActivate = useCallback(
    async (vehicleId: number) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `${API_URL}/api/vehicle/${vehicleId}/activate`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
          }
        )
        if (!response.ok) {
          throw new Error('Failed to activate vehicle')
        }
        setVehicles(prev =>
          prev.map(v => (v.id === vehicleId ? { ...v, isDelete: false } : v))
        )
        setRobotMessage('Vehicle activated successfully!')
        setRobotMessageType('success')
        setShowRobotMessage(true)
        setTimeout(() => setShowRobotMessage(false), 5000)
      } catch (err) {
        setError('Error activating vehicle. Please try again.')
        setRobotMessage('Error activating vehicle. Please try again.')
        setRobotMessageType('error')
        setShowRobotMessage(true)
        setTimeout(() => setShowRobotMessage(false), 5000)
      } finally {
        setIsLoading(false)
      }
    },
    [API_URL]
  )

  // Scroll to a specific vehicle row
  const scrollToVehicle = useCallback((licensePlate: string) => {
    const element = document.getElementById(`vehicle-${licensePlate}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setShowRobotMessage(false)
    }
  }, [])

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      const matchesSearch =
        !searchTerm ||
        vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    })
  }, [vehicles, searchTerm])

  useEffect(() => {
    if (userId) {
      loadVehicles()
    }
  }, [userId, loadVehicles])

  const getRobotIcon = () => {
    if (robotIsChecking) {
      return <Loader2 className='text-white animate-spin' size={20} />
    }
    switch (robotMessageType) {
      case 'success':
        return <CheckCircle className='text-white' size={20} />
      case 'warning':
        return <AlertTriangle className='text-white' size={20} />
      case 'error':
        return <XCircle className='text-white' size={20} />
      case 'info':
      default:
        return <Bot className='text-white' size={20} />
    }
  }

  const getRobotColorClass = () => {
    switch (robotMessageType) {
      case 'success':
        return 'bg-green-600'
      case 'warning':
        return 'bg-orange-600'
      case 'error':
        return 'bg-red-600'
      case 'info':
      default:
        return 'bg-blue-600'
    }
  }

  if (isLoading) {
    return (
      <div className='flex justify-center items-center h-screen bg-gray-50'>
        <div className='relative'>
          <div className='w-16 h-16 border-4 border-gray-200 rounded-full'></div>
          <div className='w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full absolute top-0 left-0 animate-spin'></div>
          <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
            <Car className='text-blue-500' size={20} />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex justify-center items-center h-screen bg-gray-50'>
        <div className='bg-white rounded-lg shadow-lg border p-8 text-center max-w-md'>
          <div className='w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4'>
            <Car className='text-white' size={24} />
          </div>
          <p className='text-red-600 text-lg font-medium'>{error}</p>
          {onBack && (
            <button
              onClick={onBack}
              className='mt-4 flex items-center space-x-2 mx-auto px-6 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition-colors'
            >
              <ArrowLeft size={18} />
              <span>Back to Profile</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
      />
      <MobileDropdownMenu
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
      />
      <div className='min-h-screen bg-gray-50 p-4'>
        {onBack && (
          <button
            onClick={onBack}
            className='mb-6 flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow border'
          >
            <ArrowLeft size={20} />
            <span className='font-medium'>Back to Profile</span>
          </button>
        )}

        <div className='bg-white rounded-lg shadow-sm border p-6 mb-6'>
          <div className='flex flex-col md:flex-row items-center justify-between gap-6'>
            <div className='flex items-center space-x-4'>
              <div className='w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center'>
                <Car className='text-white' size={28} />
              </div>
              <div>
                <h1 className='text-2xl font-bold text-gray-900 mb-1'>
                  My Vehicles
                </h1>
                <p className='text-gray-600'>Manage your registered vehicles</p>
              </div>
            </div>
            <div className='flex items-center space-x-4'>
              <button
                onClick={handleRobotClick}
                disabled={robotIsChecking}
                className={`flex items-center justify-center w-12 h-12 rounded-lg shadow-sm transition-all ${
                  robotIsChecking
                    ? 'bg-blue-400 cursor-wait'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
                title='Click to check vehicle violations'
              >
                <Bot className='text-white' size={24} />
              </button>
              <div className='bg-gray-100 px-4 py-2 rounded-lg border'>
                <span className='text-lg font-semibold text-gray-700'>
                  {filteredVehicles.length} Vehicles
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-white rounded-lg shadow-sm border p-4 mb-6'>
          <div className='flex flex-col md:flex-row gap-4 items-center justify-between'>
            <div className='relative flex-1 max-w-md'>
              <Search
                className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
                size={20}
              />
              <input
                type='text'
                placeholder='Search by license plate, name, or brand...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors'
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <button
              onClick={() => navigate('/addv')}
              className='flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm'
            >
              <PlusCircle size={18} />
              <span className='font-medium'>Add Vehicle</span>
            </button>
          </div>
        </div>

        <div className='bg-white rounded-lg shadow-sm border overflow-hidden'>
          {isLoading ? (
            <div className='flex justify-center items-center h-64'>
              <Loader2 className='animate-spin text-blue-500' size={48} />
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className='text-center p-12'>
              <div className='w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <Search className='text-gray-400' size={32} />
              </div>
              <p className='font-semibold text-xl text-gray-700 mb-2'>
                No vehicles found
              </p>
              <p className='text-gray-500'>
                Try adjusting your search or add some vehicles
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Vehicle
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      License Plate
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Brand
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Color
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Violations
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {filteredVehicles.map(vehicle => (
                    <tr
                      key={vehicle.id}
                      id={`vehicle-${vehicle.licensePlate}`}
                      className='hover:bg-gray-50 transition-colors'
                    >
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3'>
                            <Car className='text-blue-600' size={20} />
                          </div>
                          <div>
                            <div className='text-sm font-medium text-gray-900'>
                              {vehicle.name || `Vehicle #${vehicle.id}`}
                            </div>
                            <div className='text-sm text-gray-500'>
                              ID: {vehicle.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm font-semibold text-gray-900'>
                          {vehicle.licensePlate}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-900'>
                          {vehicle.brand}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-900'>
                          {vehicle.color}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            vehicle.isDelete
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {vehicle.isDelete ? 'Deleted' : 'Active'}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        {vehicle.isDelete ? (
                          <span className='text-sm text-gray-500'>
                            No violations (Deleted)
                          </span>
                        ) : violations[vehicle.licensePlate] &&
                          violations[vehicle.licensePlate].length > 0 ? (
                          <div className='flex items-center'>
                            <div className='w-2 h-2 bg-red-500 rounded-full mr-2'></div>
                            <span className='text-sm font-medium text-red-600'>
                              {violations[vehicle.licensePlate].length}{' '}
                              violations
                            </span>
                          </div>
                        ) : (
                          <span className='text-sm text-green-600 font-medium'>
                            No violations
                          </span>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <div className='flex items-center justify-end space-x-2'>
                          <button
                            onClick={() =>
                              navigate(
                                `/violations/history/${vehicle.licensePlate}`
                              )
                            }
                            className='inline-flex items-center w-20 justify-center px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors'
                            title='View Details'
                          >
                            <Eye size={16} className='mr-1' />
                            View
                          </button>
                          {vehicle.isDelete ? (
                            <button
                              onClick={() => handleActivate(vehicle.id)}
                              className='inline-flex items-center w-20 justify-center px-3 py-1 border border-green-300 rounded-md text-sm text-green-700 bg-green-50 hover:bg-green-100 transition-colors'
                              title='Activate Vehicle'
                            >
                              <RefreshCw size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/editv/${vehicle.id}`)}
                              className='inline-flex items-center w-20 justify-center px-3 py-1 border border-blue-300 rounded-md text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors'
                              title='Edit Vehicle'
                            >
                              <Edit size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showRobotMessage && (
          <div
            className={`fixed bottom-6 right-6 w-80 ${getRobotColorClass()} rounded-lg shadow-lg p-4 z-50 transition-all duration-300`}
          >
            <div className='flex items-start space-x-3'>
              <div
                className={`w-10 h-10 ${getRobotColorClass()} rounded-lg flex items-center justify-center flex-shrink-0`}
              >
                {getRobotIcon()}
              </div>
              <div className='flex-1'>
                <div className='flex items-center space-x-2 mb-1'>
                  <span className='text-sm font-semibold text-white'>
                    AI Assistant
                  </span>
                  {robotIsChecking && (
                    <Loader2 className='animate-spin text-white' size={16} />
                  )}
                </div>
                <p className='text-sm text-white leading-relaxed'>
                  {robotMessage}
                </p>
                {robotMessageType === 'warning' && firstViolatedPlate && (
                  <button
                    onClick={() => navigate(`/violations/history/${firstViolatedPlate}`)}
                    className='mt-2 px-3 py-1 bg-white/20 text-white text-xs rounded hover:bg-white/30 transition-colors'
                  >
                    View Details
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowRobotMessage(false)}
                className='text-white/80 hover:text-white transition-colors'
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default VehicleCustomerList
