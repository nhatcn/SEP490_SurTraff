"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
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
  Camera,
  Upload,
  Loader2,
  AlertTriangle,
  LogIn,
  Home,
  Phone,
  MapPin,
} from "lucide-react"
import { getCookie } from "../../utils/cookieUltil"
import CryptoJS from "crypto-js"

interface UserData {
  userId: number
  userName: string
  email: string | null
  status: boolean
  password: string
  avatar: string
  roleId: number
  roleName: string
  fullName: string
  phoneNumber?: string | null
  address?: string | null
}

interface UpdateUserForm {
  name: string
  userName: string
  email: string
  phoneNumber: string
  address: string
  roleId: number
  avatar?: File | null
}

export default function UserProfile() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
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
  const [updateForm, setUpdateForm] = useState<UpdateUserForm>({
    name: "",
    userName: "",
    email: "",
    phoneNumber: "",
    address: "",
    roleId: 1,
    avatar: null,
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [success, setSuccess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const userId = getCookie('userId')

  // MD5 hash function
  const hashMD5 = (text: string) => {
    return CryptoJS.MD5(text).toString()
  }

  useEffect(() => {
    if (userId) {
      fetchUserData()
    } else {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (user) {
      setUpdateForm({
        name: user.fullName || "",
        userName: user.userName || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        address: user.address || "",
        roleId: user.roleId || 1,
        avatar: null,
      })
    }
  }, [user])

  const fetchUserData = async () => {
    try {
      const response = await fetch(`http://localhost:8081/api/users/${userId}`)
      const userData = await response.json()
      setUser(userData)
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors({ avatar: "Please select a valid image file" })
        return
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ avatar: "File size must be less than 5MB" })
        return
      }

      setUpdateForm((prev) => ({ ...prev, avatar: file }))

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Clear any previous errors
      setErrors((prev) => ({ ...prev, avatar: "" }))
    }
  }

  const validateUpdateForm = () => {
    const newErrors: { [key: string]: string } = {}

    // Name validation
    if (!updateForm.name.trim()) {
      newErrors.name = "Name is required"
    }

    // Username validation
    if (!updateForm.userName.trim()) {
      newErrors.userName = "Username is required"
    }

    // Email validation
    if (!updateForm.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(updateForm.email)) {
      newErrors.email = "Please enter a valid email address (e.g., example@domain.com)"
    }

    // Phone number validation (Vietnamese format)
    if (updateForm.phoneNumber.trim()) {
      const phoneRegex = /^(?:\+84|0)(3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-4,6-9])[0-9]{7}$/
      if (!phoneRegex.test(updateForm.phoneNumber)) {
        newErrors.phoneNumber = "Please enter a valid Vietnamese phone number (e.g., +84912345678 or 0912345678)"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleUpdateProfile = async () => {
    if (!validateUpdateForm()) return

    setIsUpdating(true)
    setErrors({})

    try {
      const formData = new FormData()
      formData.append("fullName", updateForm.name)
      formData.append("userName", updateForm.userName)
      formData.append("email", updateForm.email)
      formData.append("phoneNumber", updateForm.phoneNumber)
      formData.append("address", updateForm.address)
      formData.append("roleId", updateForm.roleId.toString())

      // Only append avatar if a new file was selected
      if (updateForm.avatar instanceof File) {
        formData.append("avatarFile", updateForm.avatar)
      }

      const response = await fetch(`http://localhost:8081/api/users/update/${user?.userId}`, {
        method: "PUT",
        body: formData,
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(updatedUser)
        setSuccess("Profile updated successfully!")
        setIsEditingProfile(false)
        setAvatarPreview(null)
        setTimeout(() => setSuccess(""), 3000)
      } else {
        const errorData = await response.json()
        setErrors({ general: errorData.message || "Failed to update profile" })
      }
    } catch (error) {
      setErrors({ general: "An error occurred. Please try again." })
    } finally {
      setIsUpdating(false)
    }
  }

  const cancelProfileEdit = () => {
    if (user) {
      setUpdateForm({
        name: user.fullName || "",
        userName: user.userName || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        address: user.address || "",
        roleId: user.roleId || 1,
        avatar: null,
      })
    }
    setIsEditingProfile(false)
    setAvatarPreview(null)
    setErrors({})
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
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
      // Hash current password with MD5 before sending
      const hashedCurrentPassword = hashMD5(passwordForm.currentPassword)
      
      // First verify current password
      const verifyResponse = await fetch(`http://localhost:8081/api/users/verify-password/${user?.userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: hashedCurrentPassword,
        }),
      })

      if (!verifyResponse.ok) {
        setErrors({ currentPassword: "Incorrect current password" })
        setIsSubmitting(false)
        return
      }

      // If verification passes, proceed with password update
      const updateResponse = await fetch(`http://localhost:8081/api/users/${user?.userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword: hashMD5(passwordForm.newPassword),
        }),
      })

      if (updateResponse.ok) {
        setSuccess("Password changed successfully!")
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
        setIsEditingPassword(false)
        setTimeout(() => setSuccess(""), 3000)
      } else {
        const errorData = await updateResponse.json()
        setErrors({ general: errorData.message || "Failed to update password" })
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

  // Show not logged in state when no userId cookie
  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <AlertTriangle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Access Restricted
            </h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              You need to be logged in to view your profile information. Please sign in to continue.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => window.location.href = '/login'}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </button>
              <button
                onClick={() => window.location.href = '/home'}
                className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 hover:shadow-md"
              >
                <Home className="w-5 h-5" />
                Go to Home
              </button>
            </div>
            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-700 font-medium">
                💡 Need help? Contact our support team
              </p>
            </div>
          </div>
          <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200/30 rounded-full blur-xl"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-200/30 rounded-full blur-xl"></div>
        </div>
      </div>
    )
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
          <p className="text-gray-600 mb-6">Please try refreshing the page or contact support if the problem persists.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              Refresh Page
            </button>
            <button
              onClick={() => window.location.href = '/home'}
              className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 backdrop-blur-xl border border-green-400/20">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{success}</span>
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        <div className="relative h-32 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" style={{
          backgroundImage: `url('/traffic-camera.webp')`,
          backgroundBlendMode: 'overlay',
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}></div>
        <div className="relative px-6 pb-6">
          <div className="flex items-end -mt-16 mb-4">
            <div className="relative group">
              <div
                className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <img
                  src={avatarPreview || user.avatar || "/api/placeholder/96/96"}
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
                <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center">
                  <Camera className="w-6 h-6 text-white mb-1" />
                  <span className="text-white text-xs font-medium">Update</span>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="ml-4 flex-1">
              <h1 className="text-2xl font-bold text-white">{user.fullName}</h1>
              <p className="text-gray-100 mb-2">@{user.userName}</p>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${user.status
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
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors duration-200"
            >
              <Edit3 className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 min-h-[450px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                Personal Information
              </h2>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  <Edit3 className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>

            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium mb-4">
                {errors.general}
              </div>
            )}

            {!isEditingProfile ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</label>
                  <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg p-3">{user.fullName}</div>
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
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</label>
                  <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {user.phoneNumber || "Not provided"}
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</label>
                  <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {user.address || "Not provided"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      value={updateForm.name}
                      onChange={(e) => setUpdateForm((prev) => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm ${errors.name ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"}`}
                      placeholder="Enter full name"
                    />
                    {errors.name && <p className="text-red-500 text-xs font-medium">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Username</label>
                    <input
                      type="text"
                      value={updateForm.userName}
                      onChange={(e) => setUpdateForm((prev) => ({ ...prev, userName: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm ${errors.userName ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"}`}
                      placeholder="Enter username"
                    />
                    {errors.userName && <p className="text-red-500 text-xs font-medium">{errors.userName}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      value={updateForm.email}
                      onChange={(e) => setUpdateForm((prev) => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm ${errors.email ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"}`}
                      placeholder="Enter email address"
                    />
                    {errors.email && <p className="text-red-500 text-xs font-medium">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="tel"
                      value={updateForm.phoneNumber}
                      onChange={(e) => setUpdateForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm ${errors.phoneNumber ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"}`}
                      placeholder="Enter phone number (e.g., +84912345678)"
                    />
                    {errors.phoneNumber && <p className="text-red-500 text-xs font-medium">{errors.phoneNumber}</p>}
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Address</label>
                    <textarea
                      value={updateForm.address}
                      onChange={(e) => setUpdateForm((prev) => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm resize-none"
                      placeholder="Enter your address"
                      rows={3}
                    />
                  </div>
                </div>
                {errors.avatar && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                    {errors.avatar}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Profile Picture</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview || "/placeholder.svg"}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Upload className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Choose Image
                      </button>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF (max 5MB)</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleUpdateProfile}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isUpdating ? "Updating..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelProfileEdit}
                    className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 min-h-[450px]">
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
                    className={`text-sm font-medium rounded-lg p-3 ${user.status
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
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 pr-10 text-sm ${errors.currentPassword ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"}`}
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
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700">New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 pr-10 text-sm ${errors.newPassword ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"}`}
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
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 pr-10 text-sm ${errors.confirmPassword ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"}`}
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
        </div>
      </div>
    </div>
  )
}