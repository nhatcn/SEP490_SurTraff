import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, Car, CheckCircle, AlertCircle } from 'lucide-react';

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
      try {
        const response = await fetch('http://localhost:8081/api/violations/vehicle-types', {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const data: VehicleType[] = await response.json();
        setVehicleTypes(data);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(`Error loading vehicle types: ${message}`);
      }
    };
    fetchVehicleTypes();
  }, []);

  // Fetch vehicles for license plate validation
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch('http://localhost:8081/api/vehicle', {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const data: Vehicle[] = await response.json();
        setVehicles(data);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(`Error loading vehicles: ${message}`);
      }
    };
    fetchVehicles();
  }, []);

  // Fetch user ID automatically
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await fetch('http://localhost:8081/api/auth/current-user', {
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
    const plateRegex = /^\d{2}[A-Z]{1,2}-\d{4,5}$/;
    const colorRegex = /^[a-zA-Z\s]+$/;
    const numberRegex = /^\d+$/;

    if (!editForm.name) newErrors.name = 'Vehicle name is required';
    if (!editForm.licensePlate) {
      newErrors.licensePlate = 'License plate is required';
    } else if (!plateRegex.test(editForm.licensePlate)) {
      newErrors.licensePlate = 'Invalid format (e.g., 30A-12345 or 30AB-12345)';
    } else if (vehicles.some(v => v.licensePlate === editForm.licensePlate)) {
      newErrors.licensePlate = 'License plate already exists';
    }
    if (!editForm.userId) {
      newErrors.userId = 'User ID is required';
    } else if (!numberRegex.test(editForm.userId)) {
      newErrors.userId = 'User ID must be a number';
    }
    if (!editForm.vehicleTypeId) newErrors.vehicleTypeId = 'Vehicle type is required';
    if (!editForm.color) {
      newErrors.color = 'Color is required';
    } else if (!colorRegex.test(editForm.color)) {
      newErrors.color = 'Color must contain only letters and spaces';
    }
    if (!editForm.brand) newErrors.brand = 'Brand is required';

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
        name: editForm.name,
        licensePlate: editForm.licensePlate,
        userId: parseInt(editForm.userId),
        vehicleTypeId: parseInt(editForm.vehicleTypeId),
        color: editForm.color,
        brand: editForm.brand,
      };
      formData.append('dto', new Blob([JSON.stringify(vehicleDTO)], { type: 'application/json' }));
      if (editForm.image) {
        formData.append('imageFile', editForm.image);
      }

      const response = await fetch('http://localhost:8081/api/vehicle', {
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
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full"
            >
              <div className="flex items-center mb-4">
                <Car className="text-blue-600 mr-3" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Add New Vehicle</h3>
                  <p className="text-sm text-gray-600">Enter vehicle details below</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name</label>
                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Toyota Camry"
                    disabled={isLoading}
                  />
                  <AnimatePresence>
                    {errors.name && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-red-500 text-xs flex items-center"
                      >
                        <AlertCircle size={12} className="mr-1" />
                        {errors.name}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                  <input
                    name="licensePlate"
                    value={editForm.licensePlate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono font-bold"
                    placeholder="e.g., 30A-12345"
                    disabled={isLoading}
                  />
                  <AnimatePresence>
                    {errors.licensePlate && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-red-500 text-xs flex items-center"
                      >
                        <AlertCircle size={12} className="mr-1" />
                        {errors.licensePlate}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                  <input
                    name="userId"
                    type="text"
                    value={editForm.userId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 123"
                    disabled={true}
                  />
                  <AnimatePresence>
                    {errors.userId && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-red-500 text-xs flex items-center"
                      >
                        <AlertCircle size={12} className="mr-1" />
                        {errors.userId}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select
                    name="vehicleTypeId"
                    value={editForm.vehicleTypeId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
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
                        className="text-red-500 text-xs flex items-center"
                      >
                        <AlertCircle size={12} className="mr-1" />
                        {errors.vehicleTypeId}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    name="color"
                    value={editForm.color}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Red"
                    disabled={isLoading}
                  />
                  <AnimatePresence>
                    {errors.color && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-red-500 text-xs flex items-center"
                      >
                        <AlertCircle size={12} className="mr-1" />
                        {errors.color}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input
                    name="brand"
                    value={editForm.brand}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Toyota"
                    disabled={isLoading}
                  />
                  <AnimatePresence>
                    {errors.brand && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-red-500 text-xs flex items-center"
                      >
                        <AlertCircle size={12} className="mr-1" />
                        {errors.brand}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={inputVariants} whileFocus="focused" className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    id="vehicleImage"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={isLoading}
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
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-500 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 transition-all rounded-md"
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
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  disabled={isLoading}
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
