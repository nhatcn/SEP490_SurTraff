import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  Car, 
  AlertCircle, 
  CheckCircle, 
  ArrowLeft, 
  Eye, 
  CreditCard,
  Tag,
  Palette,
  Building2,
  Upload,
  FileImage
} from 'lucide-react';
import Sidebar from '../../../components/Layout/Sidebar';
import Header from '../../../components/Layout/Header';

// Custom debounce function
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface VehicleType {
  id: number;
  typeName: string;
}

interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
  vehicleTypeId: number;
  color: string;
  brand: string;
  image: string | null;
  isDelete: boolean | null;
  userId: number | null;
}

interface FormErrors {
  name?: string;
  licensePlate?: string;
  vehicleTypeId?: string;
  color?: string;
  brand?: string;
  image?: string;
}

interface EditForm {
  name: string;
  licensePlate: string;
  vehicleTypeId: string;
  color: string;
  brand: string;
  image: File | null;
}

const VehicleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editForm, setEditForm] = useState<EditForm>({
    name: '',
    licensePlate: '',
    vehicleTypeId: '',
    color: '',
    brand: '',
    image: null,
  });

  // Preload vehicle image
  useEffect(() => {
  if (!vehicle?.image) return undefined; // Explicitly return undefined for consistency
  const cacheBuster = `?t=${new Date().getTime()}`;
  const imageUrl = `${vehicle.image}${cacheBuster}`;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = imageUrl;
  link.as = 'image';
  document.head.appendChild(link);
  return () => {
    document.head.removeChild(link); // Execute the removal
    return undefined; // Explicitly return undefined to satisfy Destructor type
  };
}, [vehicle?.image]);

  // Fetch vehicle types
  const fetchVehicleTypes = useCallback(async () => {
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
  }, []);

  // Fetch vehicles
  const fetchVehicles = useCallback(async () => {
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
  }, []);

  // Fetch vehicle details
  const fetchVehicle = useCallback(async () => {
    if (!id || id === '0') return;
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8081/api/vehicle/${id}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data: Vehicle = await response.json();
      setVehicle(data);
      setEditForm({
        name: data.name || '',
        licensePlate: data.licensePlate || '',
        vehicleTypeId: data.vehicleTypeId ? data.vehicleTypeId.toString() : '',
        color: data.color || '',
        brand: data.brand || '',
        image: null,
      });
      setPreviewUrl(data.image || null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(`Error loading vehicle: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVehicleTypes();
    fetchVehicles();
    fetchVehicle();
  }, [fetchVehicleTypes, fetchVehicles, fetchVehicle]);

  const validateForm = () => {
    const newErrors: FormErrors = {};
    const plateRegex = /^\d{2}[A-Z]{1,2}-\d{4,5}$/;
    const textRegex = /^[a-zA-Z0-9\s]+$/;
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;

    if (!editForm.name || editForm.name.trim() === '') {
      newErrors.name = 'Vehicle name is required';
    } else if (specialCharRegex.test(editForm.name)) {
      newErrors.name = 'Vehicle name must not contain special characters';
    } else if (!textRegex.test(editForm.name)) {
      newErrors.name = 'Vehicle name must contain only letters, numbers, and spaces';
    }

    if (!editForm.licensePlate || editForm.licensePlate.trim() === '') {
      newErrors.licensePlate = 'License plate is required';
    } else if (!plateRegex.test(editForm.licensePlate)) {
      newErrors.licensePlate = 'Invalid format (e.g., 30A-12345 or 30AB-12345)';
    } else if (vehicles.some((v) => v.licensePlate === editForm.licensePlate && v.id !== Number(id))) {
      newErrors.licensePlate = 'License plate already exists';
    }

    if (!editForm.vehicleTypeId || editForm.vehicleTypeId.trim() === '') {
      newErrors.vehicleTypeId = 'Vehicle type is required';
    } else if (!vehicleTypes.some((type) => type.id === parseInt(editForm.vehicleTypeId))) {
      newErrors.vehicleTypeId = 'Selected vehicle type is invalid';
    }

    if (!editForm.color || editForm.color.trim() === '') {
      newErrors.color = 'Color is required';
    } else if (specialCharRegex.test(editForm.color)) {
      newErrors.color = 'Color must not contain special characters';
    } else if (!textRegex.test(editForm.color)) {
      newErrors.color = 'Color must contain only letters, numbers, and spaces';
    }

    if (!editForm.brand || editForm.brand.trim() === '') {
      newErrors.brand = 'Brand is required';
    } else if (specialCharRegex.test(editForm.brand)) {
      newErrors.brand = 'Brand must not contain special characters';
    } else if (!textRegex.test(editForm.brand)) {
      newErrors.brand = 'Brand must contain only letters, numbers, and spaces';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = debounce((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditForm((prev) => ({ ...prev, image: file }));
      setErrors((prev) => ({ ...prev, image: '' }));
      const imageUrl = URL.createObjectURL(file);
      setPreviewUrl(imageUrl);
      setIsModalOpen(true);
    }
  }, 300);

  const handleSave = debounce(async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const vehicleTypeIdNum = parseInt(editForm.vehicleTypeId);
      if (isNaN(vehicleTypeIdNum)) throw new Error('Invalid vehicle type ID');

      const vehicleDTO = {
        name: editForm.name,
        licensePlate: editForm.licensePlate,
        vehicleTypeId: vehicleTypeIdNum,
        color: editForm.color,
        brand: editForm.brand,
        userId: vehicle?.userId ?? null,
      };
      const formData = new FormData();
      formData.append('dto', new Blob([JSON.stringify(vehicleDTO)], { type: 'application/json' }));
      if (editForm.image) formData.append('imageFile', editForm.image);

      const response = await fetch(`http://localhost:8081/api/vehicle/${id}`, {
        method: 'PUT',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error: ${response.status}`);
      }
      const updatedData: Vehicle = await response.json();
      setVehicle(updatedData);
      setVehicles((prev) => prev.map((v) => (v.id === Number(id) ? updatedData : v)));
      setSuccessMessage(`Vehicle ${updatedData.licensePlate} updated successfully!`);
      setIsEditing(false);
      setShowConfirm(false);
      setPreviewUrl(updatedData.image || null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(`Error updating vehicle: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  const handleDelete = debounce(async () => {
    if (!id) return;
    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const response = await fetch(`http://localhost:8081/api/vehicle/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      setSuccessMessage('Vehicle deleted successfully!');
      setVehicles((prev) => prev.filter((v) => v.id !== Number(id)));
      setTimeout(() => navigate('/vehicle/add'), 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(`Error deleting vehicle: ${message}`);
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  }, 300);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (vehicle) {
      setEditForm({
        name: vehicle.name,
        licensePlate: vehicle.licensePlate,
        vehicleTypeId: vehicle.vehicleTypeId.toString(),
        color: vehicle.color,
        brand: vehicle.brand,
        image: null,
      });
      setPreviewUrl(vehicle.image || null);
    }
    setErrors({});
  };

  const MemoizedImage = React.memo(() => {
    const cacheBuster = `?t=${new Date().getTime()}`;
    const imageSrc = previewUrl ? `${previewUrl}${previewUrl.includes('blob:') ? '' : cacheBuster}` : null;

    return (
      <motion.div
        className="bg-gradient-to-br from-white/95 to-blue-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50 transform hover:scale-[1.02] transition-all duration-300 h-full flex flex-col"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-cyan-600 bg-clip-text text-transparent mb-4 flex items-center">
          <div className="w-6 h-6 mr-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center animate-pulse-slow">
            <FileImage className="w-4 h-4 text-white" />
          </div>
          Vehicle Image
        </h3>
        {imageSrc ? (
          <div className="relative group flex-grow flex items-center justify-center">
            <img
              src={imageSrc}
              alt="Vehicle Image"
              className="w-full h-auto max-h-[300px] object-contain rounded-xl border-2 border-blue-200/50 cursor-pointer transition-all duration-300 group-hover:border-blue-400 group-hover:shadow-2xl group-hover:shadow-blue-400/40"
              onClick={() => setIsModalOpen(true)}
              onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/300')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setIsModalOpen(true)}
              aria-label="Expand vehicle image"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 transform scale-90 group-hover:scale-100 transition-all duration-300">
                <Eye className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500 bg-blue-50/80 rounded-xl flex-grow flex items-center justify-center">
            <div>
              <FileImage className="w-10 h-10 mx-auto mb-4 text-gray-400" />
              <p className="font-medium">No image available</p>
            </div>
          </div>
        )}
      </motion.div>
    );
  });

  if (isLoading || (!vehicle && id !== '0')) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-100 via-gray-50 to-blue-100">
        <Sidebar />
        <div className="flex flex-col flex-grow overflow-hidden">
          <Header title="Vehicle Detail" />
          <div className="flex items-center justify-center flex-grow">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gradient-to-r from-blue-400 to-cyan-400 border-t-transparent"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 opacity-20 animate-pulse"></div>
              </div>
              <p className="text-blue-800 font-semibold bg-white/50 backdrop-blur-md px-6 py-3 rounded-full shadow-lg">
                Loading data...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vehicle && id !== '0') {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-100 via-gray-50 to-blue-100">
        <Sidebar />
        <div className="flex flex-col flex-grow overflow-hidden">
          <Header title="Vehicle Detail" />
          <div className="flex items-center justify-center flex-grow">
            <div className="text-center p-8 bg-white/95 backdrop-blur-md rounded-2xl border border-blue-200 shadow-2xl shadow-blue-300/30">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center animate-pulse">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-blue-800 mb-3">Not found</h3>
              <p className="text-blue-600 mb-6">This vehicle does not exist.</p>
              <button
                onClick={() => navigate('/vehicles')}
                className="inline-block px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/40"
                aria-label="Back to vehicle list"
              >
                Back to list
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-100 via-gray-50 to-blue-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title={`Vehicle Detail #${id}`} />
        <div className="p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header Section */}
            <motion.div
              className="bg-gradient-to-r from-white/90 via-blue-50/90 to-purple-50/90 rounded-2xl shadow-xl border border-blue-200/70 p-6 backdrop-blur-md"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40 animate-pulse">
                    <Car className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Vehicle #{id}
                    </h1>
                    <p className="text-gray-600 flex items-center mt-1">
                      <CreditCard className="w-4 h-4 mr-1 text-blue-500" />
                      {vehicle?.licensePlate || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30">
                    {vehicleTypes.find((t) => t.id === vehicle?.vehicleTypeId)?.typeName || 'Unclassified'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/vehicles')}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-200 to-blue-200 text-gray-800 rounded-xl hover:from-gray-300 hover:to-blue-300 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-400/30 relative overflow-hidden group"
                  aria-label="Back to vehicle list"
                >
                  <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                  <ArrowLeft size={16} className="mr-2 text-blue-600" />
                  Back
                </button>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/40 relative overflow-hidden group"
                    aria-label="Edit vehicle"
                  >
                    <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                    <Pencil size={16} className="mr-2" />
                    Edit
                  </button>
                ) : (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowConfirm(true)}
                      disabled={isLoading}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                      aria-label="Save changes"
                    >
                      <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                      {isLoading ? (
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Save size={16} className="mr-2" />
                      )}
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-xl hover:from-rose-600 hover:to-red-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-rose-500/40 relative overflow-hidden group"
                      aria-label="Cancel edit"
                    >
                      <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                      <X size={16} className="mr-2" />
                      Cancel
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isLoading}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                      aria-label="Delete vehicle"
                    >
                      <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Vehicle Selector */}
              <motion.div
                className="mt-6 bg-gradient-to-br from-white/95 to-blue-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-cyan-600 bg-clip-text text-transparent mb-4 flex items-center">
                  <div className="w-6 h-6 mr-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center animate-pulse-slow">
                    <Car className="w-4 h-4 text-white" />
                  </div>
                  Select Vehicle
                </h3>
                <select
                  value={id || ''}
                  onChange={(e) => navigate(`/vehicles/${e.target.value}`)}
                  className="w-full border border-blue-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm transition-all duration-300"
                  disabled={isLoading}
                >
                  <option value="0">Select a vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} - {v.name} ({v.brand})
                    </option>
                  ))}
                </select>
              </motion.div>
            </motion.div>

            {/* Main Content */}
            {id !== '0' && vehicle && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vehicle Information */}
                <div className="lg:col-span-2">
                  <motion.div
                    className="bg-gradient-to-br from-white/95 to-blue-100/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-cyan-600 bg-clip-text text-transparent mb-6 flex items-center">
                      <div className="w-6 h-6 mr-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center animate-pulse-slow">
                        <Car className="w-4 h-4 text-white" />
                      </div>
                      Vehicle Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Vehicle Name */}
                      <div className="space-y-2">
                        <label className="flex items-center text-blue-700 font-medium text-sm uppercase tracking-wide">
                          <div className="w-5 h-5 mr-2 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg flex items-center justify-center">
                            <Car className="w-3 h-3 text-white" />
                          </div>
                          Vehicle Name
                        </label>
                        {isEditing ? (
                          <input
                            name="name"
                            value={editForm.name}
                            onChange={handleChange}
                            className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all duration-300 text-gray-800 font-medium shadow-inner"
                            placeholder="e.g., Toyota Camry 2023"
                            disabled={isLoading}
                          />
                        ) : (
                          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center">
                            <span className="font-semibold text-emerald-800 flex-grow">{vehicle.name}</span>
                          </div>
                        )}
                        <AnimatePresence>
                          {errors.name && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="text-red-500 text-xs flex items-center mt-1"
                            >
                              <AlertCircle size={12} className="mr-1" />
                              {errors.name}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* License Plate */}
                      <div className="space-y-2">
                        <label className="flex items-center text-blue-700 font-medium text-sm uppercase tracking-wide">
                          <div className="w-5 h-5 mr-2 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-3 h-3 text-white" />
                          </div>
                          License Plate
                        </label>
                        {isEditing ? (
                          <input
                            name="licensePlate"
                            value={editForm.licensePlate}
                            onChange={handleChange}
                            className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all duration-300 text-gray-800 font-mono font-bold shadow-inner"
                            placeholder="e.g., 30A-12345"
                            disabled={isLoading}
                          />
                        ) : (
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center">
                            <span className="font-bold text-indigo-800 font-mono flex-grow tracking-wider">{vehicle.licensePlate}</span>
                          </div>
                        )}
                        <AnimatePresence>
                          {errors.licensePlate && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="text-red-500 text-xs flex items-center mt-1"
                            >
                              <AlertCircle size={12} className="mr-1" />
                              {errors.licensePlate}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Vehicle Type */}
                      <div className="space-y-2">
                        <label className="flex items-center text-blue-700 font-medium text-sm uppercase tracking-wide">
                          <div className="w-5 h-5 mr-2 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                            <Tag className="w-3 h-3 text-white" />
                          </div>
                          Vehicle Type
                        </label>
                        {isEditing ? (
                          <select
                            name="vehicleTypeId"
                            value={editForm.vehicleTypeId}
                            onChange={handleChange}
                            className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all duration-300 text-gray-800 font-medium shadow-inner"
                            disabled={isLoading}
                          >
                            <option value="">Select vehicle type</option>
                            {vehicleTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.typeName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center">
                            <span className="font-semibold text-orange-800 flex-grow">
                              {vehicleTypes.find((t) => t.id === vehicle.vehicleTypeId)?.typeName || 'N/A'}
                            </span>
                          </div>
                        )}
                        <AnimatePresence>
                          {errors.vehicleTypeId && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="text-red-500 text-xs flex items-center mt-1"
                            >
                              <AlertCircle size={12} className="mr-1" />
                              {errors.vehicleTypeId}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Color */}
                      <div className="space-y-2">
                        <label className="flex items-center text-blue-700 font-medium text-sm uppercase tracking-wide">
                          <div className="w-5 h-5 mr-2 bg-gradient-to-br from-pink-400 to-rose-500 rounded-lg flex items-center justify-center">
                            <Palette className="w-3 h-3 text-white" />
                          </div>
                          Color
                        </label>
                        {isEditing ? (
                          <input
                            name="color"
                            value={editForm.color}
                            onChange={handleChange}
                            className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all duration-300 text-gray-800 font-medium shadow-inner"
                            placeholder="e.g., Red"
                            disabled={isLoading}
                          />
                        ) : (
                          <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-xl px-4 py-3 flex items-center">
                            <span className="font-semibold text-pink-800 flex-grow">{vehicle.color}</span>
                          </div>
                        )}
                        <AnimatePresence>
                          {errors.color && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="text-red-500 text-xs flex items-center mt-1"
                            >
                              <AlertCircle size={12} className="mr-1" />
                              {errors.color}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Brand */}
                      <div className="space-y-2">
                        <label className="flex items-center text-blue-700 font-medium text-sm uppercase tracking-wide">
                          <div className="w-5 h-5 mr-2 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                            <Building2 className="w-3 h-3 text-white" />
                          </div>
                          Brand
                        </label>
                        {isEditing ? (
                          <input
                            name="brand"
                            value={editForm.brand}
                            onChange={handleChange}
                            className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all duration-300 text-gray-800 font-medium shadow-inner"
                            placeholder="e.g., Toyota"
                            disabled={isLoading}
                          />
                        ) : (
                          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl px-4 py-3 flex items-center">
                            <span className="font-semibold text-cyan-800 flex-grow">{vehicle.brand}</span>
                          </div>
                        )}
                        <AnimatePresence>
                          {errors.brand && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="text-red-500 text-xs flex items-center mt-1"
                            >
                              <AlertCircle size={12} className="mr-1" />
                              {errors.brand}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Vehicle Image Upload - Only in editing mode */}
                      {isEditing && (
                        <div className="md:col-span-2 space-y-2">
                          <label className="flex items-center text-blue-700 font-medium text-sm uppercase tracking-wide">
                            <div className="w-5 h-5 mr-2 bg-gradient-to-br from-violet-400 to-purple-500 rounded-lg flex items-center justify-center">
                              <Upload className="w-3 h-3 text-white" />
                            </div>
                            Vehicle Image
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            id="vehicleImage"
                            onChange={handleImageChange}
                            className="hidden"
                            disabled={isLoading}
                          />
                          <label
                            htmlFor="vehicleImage"
                            className={`flex items-center justify-center gap-3 w-full px-6 py-4 border-2 border-dashed border-violet-300 rounded-xl text-sm font-medium text-violet-700 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 hover:border-violet-400 transition-all duration-300 cursor-pointer group ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                              <Upload className="w-4 h-4 text-white" />
                            </div>
                            <div className="text-center">
                              <div className="font-semibold">{editForm.image ? 'Choose another image' : 'Choose image'}</div>
                              <div className="text-xs text-violet-600 mt-1">PNG, JPG, GIF up to 10MB</div>
                            </div>
                          </label>
                          <AnimatePresence>
                            {errors.image && (
                              <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-red-500 text-xs flex items-center mt-1"
                              >
                                <AlertCircle size={12} className="mr-1" />
                                {errors.image}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Vehicle Image */}
                {!isEditing && (
                  <div className="lg:col-span-1">
                    <MemoizedImage />
                  </div>
                )}
              </div>
            )}

            {/* Success/Error Messages */}
            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="mt-6 p-4 bg-gradient-to-br from-green-100/95 to-emerald-100/95 backdrop-blur-md rounded-2xl border border-green-200/50 shadow-xl flex items-center"
                >
                  <CheckCircle size={16} className="text-green-600 mr-2" />
                  <span className="text-green-800">{successMessage}</span>
                </motion.div>
              )}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="mt-6 p-4 bg-gradient-to-br from-red-100/95 to-rose-100/95 backdrop-blur-md rounded-2xl border border-red-200/50 shadow-xl flex items-center"
                >
                  <AlertCircle size={16} className="text-red-600 mr-2" />
                  <span className="text-red-800">{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Image Modal */}
            {isModalOpen && previewUrl && (
              <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="relative max-w-7xl max-h-full">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="absolute top-4 right-4 text-white hover:text-blue-300 transition-colors duration-300 bg-black/50 rounded-full p-2"
                    aria-label="Close image"
                  >
                    <X className="w-8 h-8" />
                  </button>
                  <img
                    src={previewUrl}
                    alt="Vehicle Image"
                    className="max-w-full max-h-full object-contain rounded-xl border-2 border-blue-200/50 shadow-2xl shadow-blue-400/40"
                    onClick={() => setIsModalOpen(false)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setIsModalOpen(false)}
                    aria-label="Close vehicle image"
                  />
                </div>
              </div>
            )}

            {/* Save Confirmation Modal */}
            {showConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-blue-200/50 p-6 max-w-md w-full">
                  <div className="flex items-center mb-4">
                    <CheckCircle className="text-green-600 mr-3" size={24} />
                    <div>
                      <h3 className="text-lg font-semibold text-blue-800">Confirm Save Changes</h3>
                      <p className="text-sm text-blue-600">Are you sure you want to save these changes?</p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="px-6 py-2 bg-gradient-to-r from-gray-200 to-blue-200 text-gray-800 rounded-xl hover:from-gray-300 hover:to-blue-300 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-400/30"
                      aria-label="Cancel save"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
                      aria-label="Confirm save"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>Confirm</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-blue-200/50 p-6 max-w-md w-full">
                  <div className="flex items-center mb-4">
                    <AlertCircle className="text-red-600 mr-3" size={24} />
                    <div>
                      <h3 className="text-lg font-semibold text-blue-800">Confirm Vehicle Deletion</h3>
                      <p className="text-sm text-blue-600">This action cannot be undone. Are you sure?</p>
                    </div>
                  </div>
                  <div className="bg-red-50/80 backdrop-blur-sm rounded-xl p-3 mb-4">
                    <p className="text-red-700 text-sm">⚠️ The vehicle will be permanently deleted from the system</p>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-6 py-2 bg-gradient-to-r from-gray-200 to-blue-200 text-gray-800 rounded-xl hover:from-gray-300 hover:to-blue-300 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-400/30"
                      aria-label="Cancel delete"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="px-6 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
                      aria-label="Confirm delete"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} />
                          <span>Confirm Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetail;