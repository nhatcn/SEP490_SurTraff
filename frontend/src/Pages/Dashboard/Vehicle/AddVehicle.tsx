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
}

const AddVehicle = ({ onVehicleAdded }: { onVehicleAdded?: (vehicle: Vehicle) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    licensePlate: '',
    userId: '',
    vehicleTypeId: '',
    color: '',
    brand: '',
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

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const payload = {
        ...editForm,
        userId: parseInt(editForm.userId),
        vehicleTypeId: parseInt(editForm.vehicleTypeId),
      };
      const response = await fetch('http://localhost:8081/api/vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const newVehicle: Vehicle = await response.json();
      setSuccessMessage(`Vehicle ${newVehicle.licensePlate} added successfully!`);
      setVehicles(prev => [...prev, newVehicle]);
      if (onVehicleAdded) onVehicleAdded(newVehicle);
      setEditForm({
        name: '',
        licensePlate: '',
        userId: '',
        vehicleTypeId: '',
        color: '',
        brand: '',
      });
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
      userId: '',
      vehicleTypeId: '',
      color: '',
      brand: '',
    });
    setErrors({});
    setSuccessMessage('');
    setErrorMessage('');
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
                {/* Vehicle Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name</label>
                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Toyota Camry"
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* License Plate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                  <input
                    name="licensePlate"
                    value={editForm.licensePlate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 30A-12345"
                    disabled={isLoading}
                  />
                  {errors.licensePlate && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.licensePlate}
                    </p>
                  )}
                </div>

                {/* User ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                  <input
                    name="userId"
                    type="text"
                    value={editForm.userId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 123"
                    disabled={isLoading}
                  />
                  {errors.userId && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.userId}
                    </p>
                  )}
                </div>

                {/* Vehicle Type */}
                <div>
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
                  {errors.vehicleTypeId && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.vehicleTypeId}
                    </p>
                  )}
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    name="color"
                    value={editForm.color}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Red"
                    disabled={isLoading}
                  />
                  {errors.color && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.color}
                    </p>
                  )}
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input
                    name="brand"
                    value={editForm.brand}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Toyota"
                    disabled={isLoading}
                  />
                  {errors.brand && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.brand}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              {successMessage && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md flex items-center">
                  <CheckCircle size={16} className="mr-2" />
                  <span>{successMessage}</span>
                </div>
              )}
              {errorMessage && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md flex items-center">
                  <AlertCircle size={16} className="mr-2" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Buttons */}
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