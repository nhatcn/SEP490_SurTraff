"use client"

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getCookie } from "../../utils/cookieUltil"
import { Header, MobileDropdownMenu } from '../../components/Layout/Menu';
import Footer from '../../components/Layout/Footer';

const AddVehicle = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    licensePlate: '',
    userId: '',
    vehicleTypeId: '',
    color: '',
    brand: '',
    image: null,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [existingPlates, setExistingPlates] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const API_URL = "http://localhost:8081";

  // Fetch userId using cookie and localStorage
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const userId = getCookie('userId');
        if (!userId) {
          setFormData((prev) => ({ ...prev, userId: "" }));
          setErrorMessage("No user ID found in cookies");
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/users/${userId}`);
        if (response.ok) {
          const user = await response.json();
          setFormData((prev) => ({ ...prev, userId: user.userId.toString() }));
        } else {
          const localStorageUserId = localStorage.getItem("userId");
          if (localStorageUserId) {
            setFormData((prev) => ({ ...prev, userId: localStorageUserId }));
            setErrorMessage("Failed to fetch user data, using localStorage userId");
          } else {
            setErrorMessage("No user ID found");
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        const localStorageUserId = localStorage.getItem("userId") || "";
        setFormData((prev) => ({ ...prev, userId: localStorageUserId }));
        setErrorMessage("Error fetching user data, using localStorage userId");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [API_URL]);

  // Fetch vehicle types from API
  useEffect(() => {
    const fetchVehicleTypes = async () => {
      try {
        const response = await fetch(`${API_URL}/api/violations/vehicle-types`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`Failed to fetch vehicle types: ${response.status}`);
        const data = await response.json();
        setVehicleTypes(data);
      } catch (error) {
        setErrorMessage(`Error loading vehicle types: ${error.message}`);
      }
    };
    fetchVehicleTypes();
  }, [API_URL]);

  // Fetch existing vehicles for the specific user to check license plates
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch(`${API_URL}/api/vehicle/user/${formData.userId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`Failed to fetch vehicles: ${response.status}`);
        const vehicles = await response.json();
        setExistingPlates(vehicles.map((vehicle) => vehicle.licensePlate));
      } catch (error) {
        setErrorMessage(`Error loading vehicles: ${error.message}`);
      }
    };
    if (formData.userId) {
      fetchVehicles();
    }
  }, [API_URL, formData.userId]);

  const validateForm = () => {
    const newErrors = {};
    const plateRegex = /^(\d{2,3}[A-Z]{0,2}-\d{4,5}(?:\.\d{2})?|\d{3,5}-[A-Z]{2,3}|[A-Z]{2,3}-\d{4,5}|\d{2}-[A-Z]{2}-\d{5}|[A-Z]{2}-\d{3}-\d{2})$/;
    const textRegex = /^[a-zA-Z0-9\s]+$/;
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    const numberRegex = /^\d+$/;

    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Vehicle name is required';
    } else if (specialCharRegex.test(formData.name)) {
      newErrors.name = 'Vehicle name must not contain special characters';
    } else if (!textRegex.test(formData.name)) {
      newErrors.name = 'Vehicle name must contain only letters, numbers, and spaces';
    }

    if (!formData.licensePlate || formData.licensePlate.trim() === '') {
      newErrors.licensePlate = 'License plate is required';
    } else if (!plateRegex.test(formData.licensePlate)) {
      newErrors.licensePlate = 'Invalid format (e.g., 30A-12345, 123-12345, 12345-AB, AB-12345, 30-AB-12345, NG-123-45, 30A-12345.67)';
    } else if (existingPlates.includes(formData.licensePlate)) {
      newErrors.licensePlate = 'License plate already exists';
    }

    if (!formData.userId || formData.userId.trim() === '') {
      newErrors.userId = 'User ID is required';
    } else if (!numberRegex.test(formData.userId)) {
      newErrors.userId = 'User ID must be a number';
    }

    if (!formData.vehicleTypeId || formData.vehicleTypeId.trim() === '') {
      newErrors.vehicleTypeId = 'Vehicle type is required';
    }

    if (!formData.color || formData.color.trim() === '') {
      newErrors.color = 'Color is required';
    } else if (specialCharRegex.test(formData.color)) {
      newErrors.color = 'Color must not contain special characters';
    } else if (!textRegex.test(formData.color)) {
      newErrors.color = 'Color must contain only letters, numbers, and spaces';
    }

    if (!formData.brand || formData.brand.trim() === '') {
      newErrors.brand = 'Brand is required';
    } else if (specialCharRegex.test(formData.brand)) {
      newErrors.brand = 'Brand must not contain special characters';
    } else if (!textRegex.test(formData.brand)) {
      newErrors.brand = 'Brand must contain only letters, numbers, and spaces';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!validateForm()) return;

    setIsLoading(true);
    const formDataToSend = new FormData();
    const vehicleDTO = {
      name: formData.name,
      licensePlate: formData.licensePlate,
      userId: parseInt(formData.userId),
      vehicleTypeId: parseInt(formData.vehicleTypeId),
      color: formData.color,
      brand: formData.brand,
    };
    formDataToSend.append('dto', new Blob([JSON.stringify(vehicleDTO)], { type: 'application/json' }));
    if (formData.image) {
      formDataToSend.append('imageFile', formData.image);
    }

    try {
      const response = await fetch(`${API_URL}/api/vehicle`, {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error: ${response.status}`);
      }

      const newVehicle = await response.json();
      setSuccessMessage(`Vehicle ${newVehicle.licensePlate} added successfully!`);
      setFormData({
        name: '',
        licensePlate: '',
        userId: formData.userId,
        vehicleTypeId: '',
        color: '',
        brand: '',
        image: null,
      });
      setPreviewUrl(null);
      setExistingPlates((prev) => [...prev, newVehicle.licensePlate]);
      setTimeout(() => {
        setSuccessMessage('');
        navigate('/vehiclelistuser');
      }, 2000);
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setFormData((prev) => ({ ...prev, image: file }));
    setErrors((prev) => ({ ...prev, image: '' }));

    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setPreviewUrl(imageUrl);
      setIsModalOpen(true);
    }
  };

  const inputVariants = {
    focused: { scale: 1.02, transition: { duration: 0.2 } },
    unfocused: { scale: 1, transition: { duration: 0.2 } },
  };

  return (
    <div>
            <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
      <MobileDropdownMenu showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-2xl mx-auto"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg"
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
              />
            </svg>
          </motion.div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Add New Vehicle
          </h1>
          <p className="text-gray-600 text-lg">Register your vehicle with ease</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 hover:shadow-3xl transition-shadow duration-300"
        >
          <div className="flex justify-start mb-6">
            <motion.button
              type="button"
              onClick={() => navigate('/vehiclelistuser')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Vehicle List</span>
            </motion.button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Vehicle Name</span>
                  </div>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Toyota Camry 2023"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-gray-50/50 hover:bg-white"
                  disabled={isLoading}
                />
                <AnimatePresence>
                  {errors.name && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-red-500 text-xs flex items-center space-x-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{errors.name}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    <span>License Plate</span>
                  </div>
                </label>
                <input
                  type="text"
                  name="licensePlate"
                  value={formData.licensePlate}
                  onChange={handleChange}
                  placeholder="e.g., 30A-12345, 123-12345, 12345-AB, AB-12345, 30-AB-12345, NG-123-45, 30A-12345.67"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-300 bg-gray-50/50 hover:bg-white font-mono"
                  disabled={isLoading}
                />
                <AnimatePresence>
                  {errors.licensePlate && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-red-500 text-xs flex items-center space-x-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{errors.licensePlate}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <span>Vehicle Type</span>
                  </div>
                </label>
                <select
                  name="vehicleTypeId"
                  value={formData.vehicleTypeId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-gray-50/50 hover:bg-white cursor-pointer"
                  disabled={isLoading}
                >
                  <option value="">Select vehicle type</option>
                  {vehicleTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.typeName}
                    </option>
                  ))}
                </select>
                <AnimatePresence>
                  {errors.vehicleTypeId && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-red-500 text-xs flex items-center space-x-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{errors.vehicleTypeId}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 32" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
                      />
                    </svg>
                    <span>Color</span>
                  </div>
                </label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  placeholder="e.g., Red"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all duration-300 bg-gray-50/50 hover:bg-white"
                  disabled={isLoading}
                />
                <AnimatePresence>
                  {errors.color && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-red-500 text-xs flex items-center space-x-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{errors.color}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                    <span>Brand</span>
                  </div>
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="e.g., Toyota"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-300 bg-gray-50/50 hover:bg-white"
                  disabled={isLoading}
                />
                <AnimatePresence>
                  {errors.brand && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-red-500 text-xs flex items-center space-x-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{errors.brand}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Vehicle Image</span>
                  </div>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  id="vehicleImage"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isLoading}
                />
                {formData.image ? (
                  <div className="flex space-x-2 w-full">
                    <label
                      htmlFor="vehicleImage"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-teal-500 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 hover:text-teal-800 transition-all duration-300 cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v9m0-9l3 3m-3-3l-3 3m6-8V5a2 2 0 00-2-2H8a2 2 0 00-2 2v4"
                        />
                      </svg>
                      <span>Choose another image</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-red-500 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 transition-all duration-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h16M4 10h16M4 14h10M4 18h10"
                        />
                      </svg>
                      <span>Preview image</span>
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="vehicleImage"
                    className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-teal-500 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 hover:text-teal-800 transition-all duration-300 cursor-pointer ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : 'focus:outline-none focus:ring-4 focus:ring-teal-200'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v9m0-9l3 3m-3-3l-3 3m6-8V5a2 2 0 00-2-2H8a2 2 0 00-2 2v4"
                      />
                    </svg>
                    <span>Choose Image</span>
                  </label>
                )}
                <AnimatePresence>
                  {errors.image && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-red-500 text-xs flex items-center space-x-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{errors.image}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
                {isModalOpen && previewUrl && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm">
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
              </motion.div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 opacity-0 hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 flex items-center justify-center space-x-2">
                {isLoading ? (
                  <>
                    <motion.div
                      className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Vehicle</span>
                  </>
                )}
              </div>
            </motion.button>
          </form>

          <AnimatePresence mode="wait">
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-800 rounded-2xl flex items-center space-x-3 shadow-sm"
              >
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="font-medium">{successMessage}</div>
              </motion.div>
            )}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-800 rounded-2xl flex items-center space-x-3 shadow-sm"
              >
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="font-medium">{errorMessage}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
    <Footer/>
    </div>
  );
};

export default AddVehicle;