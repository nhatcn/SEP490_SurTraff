import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, Car, CheckCircle, AlertCircle } from 'lucide-react';
import { API_URL_BE } from '../../../components/Link/LinkAPI';

interface VehicleType {
  id: number;
  typeName: string;
}

interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
  userId: number;
  vehicleTypeId: number;
  color: string;
  brand: string;
}

interface FormErrors {
  name?: string;
  licensePlate?: string;
  userId?: string;
  vehicleTypeId?: string;
  color?: string;
  brand?: string;
  image?: string;
}

const AddVehicle = ({ onVehicleAdded }: { onVehicleAdded?: (vehicle: Vehicle) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    licensePlate: '',
    userId: '',
    vehicleTypeId: '',
    color: '',
    brand: '',
    image: null as File | null,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Fetch vehicle types
  useEffect(() => {
    const fetchVehicleTypes = async () => {
      setIsFetching(true);
      try {
        const response = await fetch(`${API_URL_BE}api/violations/vehicle-types`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const data: VehicleType[] = await response.json();
        setVehicleTypes(data);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(`Error loading vehicle types: ${message}`);
      } finally {
        setIsFetching(false);
      }
    };
    fetchVehicleTypes();
  }, []);

  // Fetch vehicles for license plate validation
  useEffect(() => {
    const fetchVehicles = async () => {
      setIsFetching(true);
      try {
        const response = await fetch(`${API_URL_BE}api/vehicle`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const data: Vehicle[] = await response.json();
        setVehicles(data);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(`Error loading vehicles: ${message}`);
      } finally {
        setIsFetching(false);
      }
    };
    fetchVehicles();
  }, []);

  // Fetch user ID automatically
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await fetch(`${API_URL_BE}api/auth/current-user`, {
          headers: { 'Content-Type': 'application/json' },
          // 'Authorization': `Bearer ${yourToken}` // Uncomment if authentication is required
        });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const userData = await response.json();
        setEditForm(prev => ({ ...prev, userId: userData.id.toString() }));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(`Error fetching user ID: ${message}`);
      }
    };
    fetchUserId();
  }, []);

  const validateForm = () => {
    const newErrors: FormErrors = {};
    const plateRegex = /^[A-Za-z0-9\s.-]{3,15}$/;
    const textRegex = /^[a-zA-Z\s]+$/;
    const specialCharRegex = /[!@#$%^&*(),?":{}|<>]/;
    const numberRegex = /^\d+$/;

    // Validate name
    if (!editForm.name || editForm.name.trim() === '') {
      newErrors.name = 'Vehicle name is required';
    } else if (specialCharRegex.test(editForm.name)) {
      newErrors.name = 'Vehicle name must not contain special characters';
    } else if (!textRegex.test(editForm.name)) {
      newErrors.name = 'Vehicle name must contain only letters and spaces';
    }

    // Validate license plate
    if (!editForm.licensePlate || editForm.licensePlate.trim() === '') {
      newErrors.licensePlate = 'License plate is required';
    } else if (!plateRegex.test(editForm.licensePlate.trim())) {
      newErrors.licensePlate = 'License plate must be 3-15 characters (letters, numbers, spaces, dots, or dashes)';
    } else if (vehicles.some(v => v.licensePlate.toLowerCase() === editForm.licensePlate.trim().toLowerCase())) {
      newErrors.licensePlate = 'License plate already exists';
    }

    // Validate user ID
    if (!editForm.userId || editForm.userId.trim() === '') {
      newErrors.userId = 'User ID is required';
    } else if (!numberRegex.test(editForm.userId)) {
      newErrors.userId = 'User ID must be a number';
    }

    // Validate vehicle type
    if (!editForm.vehicleTypeId || editForm.vehicleTypeId.trim() === '') {
      newErrors.vehicleTypeId = 'Vehicle type is required';
    }

    // Validate color
    if (!editForm.color || editForm.color.trim() === '') {
      newErrors.color = 'Color is required';
    } else if (specialCharRegex.test(editForm.color)) {
      newErrors.color = 'Color must not contain special characters';
    } else if (!textRegex.test(editForm.color)) {
      newErrors.color = 'Color must contain only letters and spaces';
    }

    // Validate brand
    if (!editForm.brand || editForm.brand.trim() === '') {
      newErrors.brand = 'Brand is required';
    } else if (specialCharRegex.test(editForm.brand)) {
      newErrors.brand = 'Brand must not contain special characters';
    } else if (!textRegex.test(editForm.brand)) {
      newErrors.brand = 'Brand must contain only letters and spaces';
    }

    // Validate image
    if (editForm.image) {
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validImageTypes.includes(editForm.image.type)) {
        newErrors.image = 'Image must be JPEG, PNG, or GIF';
      } else if (editForm.image.size > 5 * 1024 * 1024) { // 5MB limit
        newErrors.image = 'Image size must not exceed 5MB';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditForm(prev => ({ ...prev, image: file }));
      setErrors(prev => ({ ...prev, image: '' }));
      const imageUrl = URL.createObjectURL(file);
      setPreviewUrl(imageUrl);
      setIsModalOpen(true);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const formData = new FormData();
      const vehicleDTO = {
        name: editForm.name.trim(),
        licensePlate: editForm.licensePlate.trim(),
        userId: parseInt(editForm.userId),
        vehicleTypeId: parseInt(editForm.vehicleTypeId),
        color: editForm.color.trim(),
        brand: editForm.brand.trim(),
      };
      formData.append('dto', new Blob([JSON.stringify(vehicleDTO)], { type: 'application/json' }));
      if (editForm.image) {
        formData.append('imageFile', editForm.image);
      }

      const response = await fetch(`${API_URL_BE}api/vehicle`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error: ${response.status}`);
      }
      const newVehicle: Vehicle = await response.json();
      setSuccessMessage(`Vehicle ${newVehicle.licensePlate} added successfully!`);
      setVehicles(prev => [...prev, newVehicle]);
      if (onVehicleAdded) onVehicleAdded(newVehicle);
      setEditForm({
        name: '',
        licensePlate: '',
        userId: editForm.userId,
        vehicleTypeId: '',
        color: '',
        brand: '',
        image: null,
      });
      setPreviewUrl(null);
      setTimeout(() => setIsOpen(false), 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(`Error adding vehicle: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleCancel = () => {
    setIsOpen(false);
    setEditForm({
      name: '',
      licensePlate: '',
      userId: editForm.userId,
      vehicleTypeId: '',
      color: '',
      brand: '',
      image: null,
    });
    setErrors({});
    setSuccessMessage('');
    setErrorMessage('');
    setPreviewUrl(null);
  };

  const inputVariants = {
    focused: { scale: 1.02, transition: { duration: 0.2 } },
    unfocused: { scale: 1, transition: { duration: 0.2 } },
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Add new vehicle"
      >
        <Car size={16} />
        <span>Add Vehicle</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-vehicle-title"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center mb-4">
                <Car className="text-blue-600 mr-3" size={24} />
                <div>
                  <h3 id="add-vehicle-title" className="text-lg font-semibold text-gray-800">Add New Vehicle</h3>
                  <p className="text-sm text-gray-600">Enter vehicle details below</p>
                </div>
              </div>

              {isFetching && (
                <div className="flex justify-center mb-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name</label>
                  <input
                    id="name"
                    name="name"
                    value={editForm.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Toyota Camry"
                    disabled={isLoading}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                  />
                  <AnimatePresence>
                    {errors.name && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        id="name-error"
                        className="text-red-500 text-xs flex items-center"
                      >
                        <AlertCircle size={12} className="mr-1" />
                        {errors.name}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                  <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                  <input
                    id="licensePlate"
                    name="licensePlate"
                    value={editForm.licensePlate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono font-bold"
                    placeholder="e.g., 30A-12345, 64-B1-12345, or CUSTOM123"
                    disabled={isLoading}
                    aria-invalid={!!errors.licensePlate}
                    aria-describedby={errors.licensePlate ? "licensePlate-error" : undefined}
                  />
                  <AnimatePresence>
                    {errors.licensePlate && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        id="licensePlate-error"
                        className="text-red-500 text-xs flex items-center"
                      >
                        <AlertCircle size={12} className="mr-1" />
                        {errors.licensePlate}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                  <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                  <input
                    id="userId"
                    name="userId"
                    type="text"
                    value={editForm.userId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                    placeholder="e.g., 123"
                    disabled={true}
                    aria-invalid={!!errors.userId}
                    aria-describedby={errors.userId ? "userId-error" : undefined}
                  />
                  <AnimatePresence>
                    {errors.userId && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        id="userId-error"
                        className="text-red-500 text-xs flex items-center"
                      >
                        <AlertCircle size={12} className="mr-1" />
                        {errors.userId}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                  <label htmlFor="vehicleTypeId" className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select
                    id="vehicleTypeId"
                    name="vehicleTypeId"
                    value={editForm.vehicleTypeId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading || isFetching}
                    aria-invalid={!!errors.vehicleTypeId}
                    aria-describedby={errors.vehicleTypeId ? "vehicleTypeId-error" : undefined}
                  >
                    <option value="">Select vehicle type</option>
                    {vehicleTypes.map(type => (
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
                        id="vehicleTypeId-error"
                        className="text-red-500 text-xs flex items-center"
                      >
                        <AlertCircle size={12} className="mr-1" />
                        {errors.vehicleTypeId}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                  <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    id="color"
                    name="color"
                    value={editForm.color}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Red"
                    disabled={isLoading}
                    aria-invalid={!!errors.color}
                    aria-describedby={errors.color ? "color-error" : undefined}
                  />
                  <AnimatePresence>
                    {errors.color && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        id="color-error"
                        className="text-red-500 text-xs flex items-center"
                      >
                        <AlertCircle size={12} className="mr-1" />
                        {errors.color}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                  <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input
                    id="brand"
                    name="brand"
                    value={editForm.brand}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Toyota"
                    disabled={isLoading}
                    aria-invalid={!!errors.brand}
                    aria-describedby={errors.brand ? "brand-error" : undefined}
                  />
                  <AnimatePresence>
                    {errors.brand && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        id="brand-error"
                        className="text-red-500 text-xs flex items-center"
                      >
                        <AlertCircle size={12} className="mr-1" />
                        {errors.brand}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2 md:col-span-2">
                  <label htmlFor="vehicleImage" className="block text-sm font-medium text-gray-700 mb-1">Vehicle Image</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    id="vehicleImage"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={isLoading}
                    aria-describedby={errors.image ? "image-error" : undefined}
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
                        <span>Choose another image</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-blue-500 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 transition-all rounded-md"
                        aria-label="Preview selected image"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h16M4 10h16M4 14h10M4 18h10" />
                        </svg>
                        <span>Preview image</span>
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
                      <span>Choose image</span>
                    </label>
                  )}
                  <AnimatePresence>
                    {errors.image && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        id="image-error"
                        className="text-red-500 text-xs flex items-center"
                      >
                        <AlertCircle size={12} className="mr-1" />
                        {errors.image}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {isModalOpen && previewUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="relative w-[90%] max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 transition-all duration-300">
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="absolute top-3 right-3 text-gray-500 hover:text-red-500 transition-colors duration-200"
                      aria-label="Close image preview"
                    >
                      <X size={24} />
                    </button>
                    <div className="w-full h-[300px] flex items-center justify-center rounded-xl overflow-hidden bg-gray-50">
                      <img
                        src={previewUrl}
                        alt="Vehicle preview"
                        className="max-w-full max-h-full object-contain rounded-md"
                      />
                    </div>
                  </div>
                </div>
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

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                  aria-label="Cancel adding vehicle"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={isLoading || isFetching}
                  aria-label="Save vehicle"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AddVehicle;