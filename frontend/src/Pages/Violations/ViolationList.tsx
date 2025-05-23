import { useEffect, useState } from 'react'
import Sidebar from '../../components/Layout/Sidebar'
import Header from '../../components/Layout/Header'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { AlertDialog } from './AlertDialog'
import { format } from 'date-fns'
import { toast } from 'react-toastify'
import { EyeIcon, TrashIcon } from "@heroicons/react/24/outline";

interface ViolationType {
  id: number
  typeName: string
}

interface VehicleType {
  id: number
  name: string
}

interface Camera {
  id: number
  name: string
  location: string
}

interface Violation {
  id: number
  camera: Camera | null
  violationType: ViolationType | null
  vehicleType: VehicleType | null
  licensePlate: string | null
  vehicleColor: string | null
  vehicleBrand: string | null
  imageUrl: string | null
  videoUrl: string | null
  violationTime: string | null
  createdAt: string | null
}

export default function ViolationList () {
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const navigate = useNavigate()

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081'

  useEffect(() => {
    axios
      .get(`${API_URL}/api/violations`)
      .then(res => {
        console.log('API response:', res.data) // Kiểm tra dữ liệu API
        setViolations(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Không thể tải danh sách vi phạm.')
        setLoading(false)
      })
  }, []) // Không cần authHeader vì endpoint là permitAll

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/api/violations/${id}`)
      setViolations(prev => prev.filter(v => v.id !== id))
      setOpenDialog(false)
      toast.success('Xóa vi phạm thành công!')
    } catch (err) {
      console.error('Xóa thất bại', err)
      toast.error('Không thể xóa vi phạm.')
    }
  }

  return (
    <div className='flex h-screen'>
      <Sidebar />
      <div className='flex flex-col flex-grow overflow-hidden'>
        <Header title='Danh sách vi phạm giao thông' />
        <div className='flex-grow p-4 overflow-auto'>
          {loading ? (
            <div className='flex justify-center items-center h-full'>
              <div className='animate-spin h-10 w-10 border-t-2 border-b-2 border-blue-500 rounded-full'></div>
            </div>
          ) : error ? (
            <div className='text-center text-red-600 bg-red-100 p-4 rounded-md'>
              {error}
            </div>
          ) : (
            <table className='min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden'>
              <thead className='bg-gray-100'>
                <tr>
                  <th className='text-left p-3'>Hình ảnh</th>
                  <th className='text-left p-3'>Vi phạm</th>
                  <th className='text-left p-3'>Camera</th>
                  <th className='text-left p-3'>Biển số</th>
                  <th className='text-left p-3'>Thời gian</th>
                  <th className='text-left p-3'>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {violations.map(violation => (
                  <tr key={violation.id} className='border-t hover:bg-gray-50'>
                    <td className='p-3'>
                      {violation.imageUrl ? (
                        <img
                          src={violation.imageUrl}
                          alt='violation'
                          className='h-16 w-24 object-cover rounded'
                          loading='lazy'
                        />
                      ) : (
                        <span className='text-gray-500'>Không có ảnh</span>
                      )}
                    </td>
                    <td className='p-3'>
                      {violation.violationType?.typeName || 'N/A'}
                    </td>
                    <td className='p-3'>
                      {violation.camera
                        ? `${violation.camera.name} - ${violation.camera.location}`
                        : 'N/A'}
                    </td>
                    <td className='p-3'>{violation.licensePlate || 'N/A'}</td>
                    <td className='p-3'>
                      {violation.violationTime
                        ? format(
                            new Date(violation.violationTime),
                            'dd/MM/yyyy HH:mm:ss'
                          )
                        : 'N/A'}
                    </td>
                    <td className='p-3 space-x-2'>
                      <button
                        className='p-2 rounded bg-blue-100 text-blue-600 hover:bg-blue-200'
                        onClick={() => navigate(`/violations/${violation.id}`)}
                        title='Xem chi tiết'
                      >
                        <EyeIcon className='h-5 w-5' />
                      </button>
                      <button
                        className='p-2 rounded bg-red-100 text-red-600 hover:bg-red-200'
                        onClick={() => {
                          setSelectedId(violation.id)
                          setOpenDialog(true)
                        }}
                        title='Xóa vi phạm'
                      >
                        <TrashIcon className='h-5 w-5' />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <AlertDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onConfirm={() => {
          if (selectedId !== null) handleDelete(selectedId)
        }}
        title='Xác nhận xóa'
        description='Bạn có chắc muốn xóa vi phạm này? Hành động này không thể hoàn tác.'
      />
    </div>
  )
}
