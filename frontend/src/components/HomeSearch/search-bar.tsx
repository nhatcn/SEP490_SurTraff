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

export function SearchBar({ onSearch, initialSearchQuery = "", isSearching }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [filteredPlates, setFilteredPlates] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch vehicles on component mount
  useEffect(() => {
    const fetchVehicles = async () => {
      setIsLoadingVehicles(true)
      try {
        // Using a fixed userId of 7 as per the requirement
        const response = await fetch("http://localhost:8081/api/vehicle/user/7")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: Vehicle[] = await response.json()
        setVehicles(data)
      } catch (error) {
        console.error("Failed to fetch vehicles:", error)
        // In a real application, you might want to display an error message to the user
      } finally {
        setIsLoadingVehicles(false)
      }
    }
    fetchVehicles()
  }, [])

  // Filter plates based on search query whenever query or vehicles change
  useEffect(() => {
    if (searchQuery.trim() === "") {
      // If search query is empty, show all license plates
      setFilteredPlates(vehicles.map((v) => v.licensePlate))
    } else {
      // Filter plates that include the search query (case-insensitive)
      const filtered = vehicles
        .map((v) => v.licensePlate)
        .filter((plate) => plate.toLowerCase().includes(searchQuery.toLowerCase()))
      setFilteredPlates(filtered)
    }
  }, [searchQuery, vehicles])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setShowDropdown(true) // Show dropdown on input change
  }

  const handlePlateSelect = (plate: string) => {
    setSearchQuery(plate)
    setShowDropdown(false)
    onSearch(plate) // Trigger search immediately when a plate is selected from the dropdown
  }

  const handleSearchClick = () => {
    onSearch(searchQuery)
    setShowDropdown(false) // Hide dropdown after search
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchClick()
    }
  }

  // Close dropdown when clicking outside of the search bar or dropdown
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
              onFocus={() => setShowDropdown(true)} // Show dropdown on focus
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
