"use client"

import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import DeleteButton from "../Button/DeleteButton"
import ViewButton from "../Button/ViewButton"
import ConfirmDialog from "../UI/PopUp/ConfirmDialog"
import GenericTable, { type TableColumn, type FilterConfig } from "../Table/GenericTable" // Removed TableAction as we're handling actions manually

interface CameraType {
  id: number
  name: string
  location: string
  streamUrl: string
  status: boolean
  latitude: number
  longitude: number
  thumbnail: string | null
  createdAt: string
}

interface AccidentType {
  id: number
  cameraId: number
  location: string
  status: string
  accidentTime: string
}

export default function AccidentTable() {
  const [accidents, setAccidents] = useState<AccidentType[]>([])
  const [cameras, setCameras] = useState<CameraType[]>([])
  const [statusOptions, setStatusOptions] = useState<{ value: string; label: string }[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "",
  })
  const [modalDeleteId, setModalDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const navigate = useNavigate()

  // Function to fetch accident data
  const fetchAccidentData = useCallback(() => {
    fetch("http://localhost:8081/api/accident")
      .then((res) => res.json())
      .then((data: AccidentType[]) => {
        setAccidents(data)
        // Extract unique statuses
        const uniqueStatuses = Array.from(new Set(data.map((acc) => acc.status)))
        const options = uniqueStatuses.map((status) => ({
          value: status,
          label: status,
        }))
        setStatusOptions(options)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    fetchAccidentData()
    // Fetch camera data
    fetch("http://localhost:8000/api/cameras")
      .then((res) => res.json())
      .then(setCameras)
      .catch(console.error)
  }, [fetchAccidentData])

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const resetFilters = () => {
    setFilterValues({
      status: "",
    })
  }

  const filters: FilterConfig[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: statusOptions,
    },
  ]

  const filteredAccidents = accidents.filter((acc) => {
    const matchStatus = !filterValues.status || acc.status === filterValues.status
    return matchStatus
  })

  const handleDelete = async () => {
    if (modalDeleteId === null) return
    setIsDeleting(true)
    try {
      const res = await fetch(`http://localhost:8081/api/accident/${modalDeleteId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        alert("Deleted successfully.")
        fetchAccidentData() // Re-fetch data after successful deletion
      } else {
        alert("Failed to delete accident.")
      }
    } catch (error) {
      console.error(error)
      alert("An error occurred while deleting the accident.")
    } finally {
      setIsDeleting(false)
      setModalDeleteId(null)
    }
  }

  const handleProcess = async (id: number) => {
    setIsProcessing(true)
    try {
      const res = await fetch(`http://localhost:8081/api/accident/${id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) {
        alert("Accident processed successfully.")
        fetchAccidentData() // Re-fetch data to update status
      } else {
        alert("Failed to process accident.")
      }
    } catch (error) {
      console.error(error)
      alert("An error occurred while processing the accident.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (id: number) => {
    setIsRejecting(true)
    try {
      const res = await fetch(`http://localhost:8081/api/accident/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) {
        alert("Accident rejected successfully.")
        fetchAccidentData() // Re-fetch data to update status
      } else {
        alert("Failed to reject accident.")
      }
    } catch (error) {
      console.error(error)
      alert("An error occurred while rejecting the accident.")
    } finally {
      setIsRejecting(false)
    }
  }

  const columns: TableColumn<AccidentType>[] = [
    {
      key: "cameraId",
      title: "Camera",
      render: (value) => cameras.find((cam) => cam.id === value)?.name || "Unknown",
    },
    { key: "location", title: "Location" },
    {
      key: "accidentTime",
      title: "Time",
      render: (value) => new Date(value).toLocaleString(),
    },
    { key: "status", title: "Status" },
    {
      key: "actions", // Custom key for actions column
      title: "Actions",
      render: (value, record) => {
        if (record.status === "Requested") {
          return (
            <div className="flex space-x-2">
              <button
                onClick={() => handleProcess(record.id)}
                className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Process"}
              </button>
              <button
                onClick={() => handleReject(record.id)}
                className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isRejecting}
              >
                {isRejecting ? "Rejecting..." : "Reject"}
              </button>
            </div>
          )
        } else {
          return (
            <div className="flex space-x-2">
              <ViewButton size="sm" onClick={() => navigate(`/accidents/${record.id}`)} />
              <DeleteButton size="sm" variant="icon" onClick={() => setModalDeleteId(record.id)} />
            </div>
          )
        }
      },
    },
  ]

  return (
    <>
      <GenericTable<AccidentType>
        data={accidents}
        filteredData={filteredAccidents}
        columns={columns}
        rowKey="id"
        // actions={actions} // Removed static actions prop
        emptyMessage="No accident data available"
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onResetFilters={resetFilters}
      />
      <ConfirmDialog
        isOpen={modalDeleteId !== null}
        title="Confirm Deletion"
        message="Are you sure you want to delete this accident?"
        onConfirm={handleDelete}
        onCancel={() => setModalDeleteId(null)}
        confirmButtonText={isDeleting ? "Deleting..." : "Confirm"}
        confirmButtonColor="bg-red-500 hover:bg-red-600"
      />
    </>
  )
}
