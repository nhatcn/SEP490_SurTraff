"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  User,
  Mail,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Save,
  X,
  CheckCircle,
  UserCircle,
  Settings,
  Edit3,
  Award,
  Car,
  Palette,
  Hash,
  Tag,
  MapPin,
  TrendingUp,
  Activity,
  Zap,
  BarChart3,
} from "lucide-react"

interface UserData {
  userId: number
  userName: string
  email: string | null
  status: boolean
  password: string
  avatar: string
  roleId: number
  roleName: string
  name: string
}

interface VehicleData {
  id: number
  name: string
  licensePlate: string
  userId: number
  vehicleTypeId: number
  color: string
  brand: string
}

interface TrafficStats {
  totalViolations: number
  recentViolations: number
  cleanDays: number
  lastViolation: string
}

export default function UserProfile() {
  const [user, setUser] = useState<UserData | null>(null)
  const [vehicle, setVehicle] = useState<VehicleData | null>(null)
  const [trafficStats, setTrafficStats] = useState<TrafficStats>({
    totalViolations: 3,
    recentViolations: 1,
    cleanDays: 45,
    lastViolation: "2024-06-15",
  })
  const [loading, setLoading] = useState(true)
  const [vehicleLoading, setVehicleLoading] = useState(true)
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [success, setSuccess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchUserData()
    fetchVehicleData()
  }, [])

  const fetchUserData = async () => {
    try {
      const userId = 1 // Replace with actual userId source
      const response = await fetch(`http://localhost:8081/api/users/${userId}`)
      const userData = await response.json()
      setUser(userData)
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVehicleData = async () => {
    try {
      // Get userId from cookie or use default
      const userId = 1 // Replace with actual userId from cookie
      const response = await fetch(`http://localhost:8081/api/vehicle/${userId}`)
      if (response.ok) {
        const vehicleData = await response.json()
        setVehicle(vehicleData)
      }
    } catch (error) {
      console.error("Error fetching vehicle data:", error)
    } finally {
      setVehicleLoading(false)
    }
  }

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  const validatePassword = () => {
    const newErrors: { [key: string]: string } = {}

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = "Please enter your current password"
    }

    if (!passwordForm.newPassword) {
      newErrors.newPassword = "Please enter a new password"
    } else if (passwordForm.newPassword.length < 6) {
      newErrors.newPassword = "New password must be at least 6 characters"
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = "Password confirmation does not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePasswordChange = async (e: React.MouseEvent) => {
    e.preventDefault()

    if (!validatePassword()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      const response = await fetch(`http://localhost:8081/api/users/${user?.userId}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      if (response.ok) {
        setSuccess("Password changed successfully!")
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
        setIsEditingPassword(false)
        setTimeout(() => setSuccess(""), 3000)
      } else {
        const errorData = await response.json()
        setErrors({ currentPassword: "Incorrect current password" })
      }
    } catch (error) {
      setErrors({ general: "An error occurred. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancelPasswordEdit = () => {
    setIsEditingPassword(false)
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    setErrors({})
  }

  const getVehicleTypeIcon = (vehicleTypeId: number) => {
    // You can customize this based on your vehicle types
    switch (vehicleTypeId) {
      case 1:
        return "🚗" // Car
      case 2:
        return "🏍️" // Motorcycle
      case 3:
        return "🚚" // Truck
      default:
        return "🚗"
    }
  }

  const getColorEmoji = (color: string) => {
    const colorMap: { [key: string]: string } = {
      black: "⚫",
      white: "⚪",
      red: "🔴",
      blue: "🔵",
      green: "🟢",
      yellow: "🟡",
      orange: "🟠",
      purple: "🟣",
      gray: "⚫",
      silver: "⚪",
    }
    return colorMap[color.toLowerCase()] || "🎨"
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-3 border-transparent border-r-purple-600 rounded-full animate-spin animate-reverse"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center p-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Unable to load user information</h3>
          <p className="text-gray-600">Please try refreshing the page or contact support if the problem persists.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success notification */}
      {success && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 backdrop-blur-xl border border-green-400/20">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{success}</span>
          </div>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        {/* Cover Background */}
        <div className="relative h-32 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/20 backdrop-blur-xl rounded-lg px-3 py-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white text-sm font-medium">Online</span>
          </div>
        </div>

        {/* Profile Content */}
        <div className="relative px-6 pb-6">
          {/* Avatar */}
          <div className="flex items-end -mt-16 mb-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                <img
                  src={user.avatar || "/api/placeholder/96/96"}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                    if (target.nextElementSibling) {
                      ;(target.nextElementSibling as HTMLElement).style.display = "flex"
                    }
                  }}
                />
                <div className="w-full h-full hidden items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                  <UserCircle className="w-12 h-12 text-gray-400" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
            </div>

            {/* User Info */}
            <div className="ml-4 flex-1">
              <h1 className="text-2xl font-bold text-white">{user.name}</h1>
              <p className="text-gray-100 mb-2">@{user.userName}</p>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.status
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-red-100 text-red-700 border border-red-200"
                  }`}
                >
                  {user.status ? "Active" : "Inactive"}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200 capitalize">
                  {user.roleName}
                </span>
              </div>
            </div>

            <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors duration-200">
              <Edit3 className="w-4 h-4 text-gray-600" />
            </button>
          </div>

      
          
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                Personal Information
              </h2>
              <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200">
                <Edit3 className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</label>
                <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg p-3">{user.name}</div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Username</label>
                <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg p-3">{user.userName}</div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</label>
                <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {user.email || "Not provided"}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</label>
                <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg p-3">#{user.userId}</div>
              </div>
            </div>
          </div>

          {/* Traffic Statistics */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                Traffic Statistics
              </h2>
              <div className="flex items-center gap-2 bg-green-100 rounded-full px-3 py-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">Live</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-700 mb-1">{trafficStats.cleanDays}</div>
                <div className="text-green-600 font-medium text-sm">Consecutive Clean Days</div>
                <div className="text-xs text-green-500 mt-1">Keep it up!</div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </div>
                  <Activity className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-red-700 mb-1">{trafficStats.totalViolations}</div>
                <div className="text-red-600 font-medium text-sm">Total Violations</div>
                <div className="text-xs text-red-500 mt-1">Last: {trafficStats.lastViolation}</div>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Monthly Behavior
              </h3>
              <div className="h-24 bg-white/50 rounded-lg flex items-center justify-center">
                <div className="text-gray-500 text-center">
                  <BarChart3 className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <div className="text-xs">Chart visualization</div>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                  <Car className="w-4 h-4 text-white" />
                </div>
                Vehicle Information
              </h2>
              <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200">
                <Edit3 className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {vehicleLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
              </div>
            ) : vehicle ? (
              <div className="space-y-6">
                {/* Vehicle Overview */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-xl">
                      {getVehicleTypeIcon(vehicle.vehicleTypeId)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{vehicle.name}</h3>
                      <p className="text-orange-600 font-bold">{vehicle.licensePlate}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs font-medium text-green-700">Active</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Vehicle Name
                    </label>
                    <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg p-3">{vehicle.name}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      License Plate
                    </label>
                    <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg p-3 font-mono">
                      {vehicle.licensePlate}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Brand
                    </label>
                    <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg p-3">{vehicle.brand}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Palette className="w-3 h-3" />
                      Color
                    </label>
                    <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                      {getColorEmoji(vehicle.color)}
                      <span className="capitalize">{vehicle.color}</span>
                    </div>
                  </div>
                </div>

                
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Vehicle Registered</h3>
                <p className="text-gray-600 mb-4 text-sm">Register your vehicle for traffic monitoring.</p>
                <button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 text-sm">
                  Register Vehicle
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Security Settings */}
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                Security
              </h2>
              <Settings className="w-4 h-4 text-gray-400" />
            </div>

            {!isEditingPassword ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</label>
                  <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg p-3 capitalize">
                    {user.roleName}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
                  <div
                    className={`text-sm font-medium rounded-lg p-3 ${
                      user.status
                        ? "text-green-700 bg-green-50 border border-green-200"
                        : "text-red-700 bg-red-50 border border-red-200"
                    }`}
                  >
                    {user.status ? "✅ Active & Secure" : "🔒 Account Locked"}
                  </div>
                </div>

                <button
                  onClick={() => setIsEditingPassword(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                >
                  <Lock className="w-4 h-4" />
                  Change Password
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {errors.general && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                    {errors.general}
                  </div>
                )}

                {/* Current Password */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 pr-10 text-sm ${
                        errors.currentPassword ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"
                      }`}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("current")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="text-red-500 text-xs font-medium">{errors.currentPassword}</p>
                  )}
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700">New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 pr-10 text-sm ${
                        errors.newPassword ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"
                      }`}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("new")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="text-red-500 text-xs font-medium">{errors.newPassword}</p>}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 pr-10 text-sm ${
                        errors.confirmPassword ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"
                      }`}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("confirm")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs font-medium">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handlePasswordChange}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSubmitting ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelPasswordEdit}
                    className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

         

          {/* System Info */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
                <Activity className="w-3 h-3 text-white" />
              </div>
              System Info
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Last Login</span>
                <span className="text-sm font-medium text-gray-900">Today, 09:30 AM</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Session Time</span>
                <span className="text-sm font-medium text-gray-900">2h 15m</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">IP Address</span>
                <span className="text-sm font-medium text-gray-900">192.168.1.100</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
