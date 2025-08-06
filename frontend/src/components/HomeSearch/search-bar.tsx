"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Search, Car } from "lucide-react"

interface Vehicle {
  id: number
  name: string
  licensePlate: string
  userId: number
  vehicleTypeId: number
  color: string
  brand: string
}

interface SearchBarProps {
  onSearch: (query: string) => void
  initialSearchQuery?: string
  isSearching: boolean
}

// Helper to decode JWT token and get payload
function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (err) {
    console.error('Error decoding token', err)
    return null
  }
}

export function SearchBar({ onSearch, initialSearchQuery = "", isSearching }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [filteredPlates, setFilteredPlates] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchVehicles = async () => {
      setIsLoadingVehicles(true)
      try {
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("No token found")
        }

        const payload = parseJwt(token)
        const userId = payload?.userId
        if (!userId) {
          throw new Error("Invalid token: missing userId")
        }

        const response = await fetch(`http://localhost:8081/api/vehicle/user/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: Vehicle[] = await response.json()
        setVehicles(data)
      } catch (error) {
        console.error("Failed to fetch vehicles:", error)
      } finally {
        setIsLoadingVehicles(false)
      }
    }

    fetchVehicles()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPlates(vehicles.map((v) => v.licensePlate))
    } else {
      const filtered = vehicles
        .map((v) => v.licensePlate)
        .filter((plate) => plate.toLowerCase().includes(searchQuery.toLowerCase()))
      setFilteredPlates(filtered)
    }
  }, [searchQuery, vehicles])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setShowDropdown(true)
  }

  const handlePlateSelect = (plate: string) => {
    setSearchQuery(plate)
    setShowDropdown(false)
    onSearch(plate)
  }

  const handleSearchClick = () => {
    onSearch(searchQuery)
    setShowDropdown(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchClick()
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="max-w-3xl mx-auto mb-16">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-2 border border-white/20 shadow-2xl">
        <div className="flex items-center relative">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter license plate number (e.g., 30A-12345)"
              className="w-full px-8 py-6 text-lg bg-white/90 backdrop-blur-xl border-0 rounded-2xl focus:ring-4 focus:ring-blue-500/30 focus:outline-none placeholder-gray-500 font-medium"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => setShowDropdown(true)}
              onKeyPress={handleKeyPress}
              aria-label="License plate search input"
            />
            <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          <button
            onClick={handleSearchClick}
            disabled={isSearching || isLoadingVehicles}
            className="ml-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 rounded-2xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
          >
            {isSearching ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                <span className="font-semibold">Searching...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                <span className="font-semibold">Search Now</span>
              </div>
            )}
          </button>

          {showDropdown && (filteredPlates.length > 0 || isLoadingVehicles) && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-white/30 z-50 max-h-60 overflow-y-auto"
            >
              {isLoadingVehicles ? (
                <div className="p-4 text-gray-600 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 mr-2"></div>
                  Loading license plates...
                </div>
              ) : filteredPlates.length > 0 ? (
                <ul>
                  {filteredPlates.map((plate, index) => (
                    <li
                      key={index}
                      className="px-6 py-3 cursor-pointer hover:bg-blue-50/50 transition-colors duration-200 text-gray-800 font-medium"
                      onClick={() => handlePlateSelect(plate)}
                    >
                      {plate}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-gray-600">No matching license plates found.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
