import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios, { AxiosError } from 'axios';
import { motion } from 'framer-motion';
import { Camera, Car, Clock, MapPin, AlertTriangle, Search, ChevronDown, Filter, X } from 'lucide-react';
import RequestButton from '../../components/RequestButton/RequestButton';
import API_URL_BE from '../../components/Link/LinkAPI';

// Define ViolationsDTO interface
interface ViolationsDTO {
  id: number;
  camera?: {
    id: number;
    name: string;
    location: string;
    streamUrl: string;
    thumbnail: string;
    zoneId: number;
    latitude: number;
    longitude: number;
  };
  vehicleType?: {
    id: number;
    typeName: string;
  };
  vehicle?: {
    id: number;
    name: string;
    licensePlate: string;
    userId: number;
    vehicleTypeId: number;
    color: string;
    brand: string;
  };
  createdAt?: string;
  violationDetails?: Array<{
    id: number;
    violationId: number;
    violationTypeId: number;
    violationType: {
      id: number;
      typeName: string;
      description: string;
    };
    imageUrl: string;
    videoUrl: string;
    location: string;
    violationTime: string;
    speed: number;
    additionalNotes: string;
    createdAt: string;
  }>;
  status?: string;
}

interface ViolationListProps {
  userId: number;
}

const ViolationCustomerList: React.FC<ViolationListProps> = ({ userId }) => {
  const [violations, setViolations] = useState<ViolationsDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');


  // Get unique statuses
  const statuses = useMemo(() => {
    const uniqueStatuses = new Set<string>();
    violations.forEach((violation) => {
      if (violation.status) uniqueStatuses.add(violation.status);
    });
    return Array.from(uniqueStatuses);
  }, [violations]);

  // Filter violations
  const filteredViolations = useMemo(() => {
    return violations.filter((violation) => {
      const matchesSearch =
        !searchTerm ||
        violation.vehicle?.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !filterStatus || violation.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [violations, searchTerm, filterStatus]);

  // Load violations list
  const loadViolations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get<ViolationsDTO[]>(`${API_URL_BE}/api/violations/user/${3}`);
      setViolations(response.data);
    } catch (err) {
      const error = err as AxiosError;
      if (error.response?.status === 404) {
        setError('No violations found for this user.');
      } else {
        setError('An error occurred while loading the violations list.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  // Handle status update
  const handleStatusUpdate = useCallback((updatedViolation: ViolationsDTO) => {
    setViolations((prev) =>
      prev.map((v) => (v.id === updatedViolation.id ? updatedViolation : v))
    );
  }, []);

  // Status colors
  const getStatusColor = (status: string | undefined) => {
    const statusMap: { [key: string]: { bg: string; text: string; icon: string; gradient: string } } = {
      Request: { 
        bg: 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200', 
        text: 'text-amber-700', 
        icon: 'bg-gradient-to-r from-amber-400 to-orange-500 animate-pulse shadow-lg',
        gradient: 'from-amber-400 to-orange-500'
      },
      RESOLVED: { 
        bg: 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200', 
        text: 'text-emerald-700', 
        icon: 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-lg',
        gradient: 'from-emerald-400 to-green-500'
      },
      DISMISSED: { 
        bg: 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-200', 
        text: 'text-rose-700', 
        icon: 'bg-gradient-to-r from-rose-400 to-red-500 shadow-lg',
        gradient: 'from-rose-400 to-red-500'
      },
    };
    return statusMap[status || ''] || { 
      bg: 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200', 
      text: 'text-slate-600', 
      icon: 'bg-gradient-to-r from-slate-400 to-gray-400 shadow-lg',
      gradient: 'from-slate-400 to-gray-400'
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="relative"
        >
          <div className="w-16 h-16 border-4 border-violet-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full absolute top-0 left-0 animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <AlertTriangle className="text-violet-500" size={20} />
          </div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-rose-200 p-8 text-center max-w-md"
        >
          <div className="w-16 h-16 bg-gradient-to-r from-rose-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-white" size={24} />
          </div>
          <p className="text-rose-600 text-lg font-medium">{error}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 p-6">
      {/* Header */}
      <motion.div
        className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 mb-8"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <motion.div
              className="p-4 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 rounded-2xl shadow-2xl"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <AlertTriangle className="text-white" size={28} />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Traffic Violations Dashboard
              </h1>
              <p className="text-slate-600 flex items-center space-x-2 mt-2">
                <Clock size={18} className="text-violet-500" />
                <span>Monitor and manage your traffic violations</span>
              </p>
            </div>
          </div>
          <motion.div
            className="flex items-center space-x-3 bg-gradient-to-r from-violet-100 to-purple-100 px-6 py-3 rounded-2xl border border-violet-200 shadow-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-3 h-3 bg-gradient-to-r from-violet-400 to-purple-500 rounded-full animate-pulse"></div>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              {filteredViolations.length} Violations
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6 mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="flex justify-between items-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
          >
            <Filter size={18} />
            <span className="font-medium">Filters</span>
            <motion.div
              animate={{ rotate: showFilters ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown size={18} />
            </motion.div>
          </motion.button>
          
          {(searchTerm || filterStatus) && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('');
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <X size={16} />
              <span className="text-sm font-medium">Clear Filters</span>
            </motion.button>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ 
            opacity: showFilters ? 1 : 0, 
            height: showFilters ? 'auto' : 0 
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="mt-8 pt-6 border-t border-gradient-to-r from-violet-200 to-purple-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Search License Plate
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-violet-400" size={18} />
                <input
                  type="text"
                  placeholder="Enter license plate..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-violet-200 rounded-2xl focus:ring-4 focus:ring-violet-200 focus:border-violet-400 transition-all duration-300 shadow-lg bg-white/80 backdrop-blur-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Status Filter
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border-2 border-violet-200 rounded-2xl focus:ring-4 focus:ring-violet-200 focus:border-violet-400 transition-all duration-300 shadow-lg bg-white/80 backdrop-blur-sm"
              >
                <option value="">All Statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status || 'Undefined'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Violations Grid */}
      {filteredViolations.length === 0 ? (
        <motion.div
          className="text-slate-500 text-center text-xl bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-12 border border-white/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-24 h-24 bg-gradient-to-r from-slate-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="text-slate-400" size={32} />
          </div>
          <p className="font-medium">No violations found</p>
          <p className="text-slate-400 mt-2">Try adjusting your search criteria</p>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {filteredViolations.map((violation, index) => (
            <motion.div
              key={violation.id}
              className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/50 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
                  Violation #{violation.id}
                </h3>
                <motion.div
                  className={`inline-flex items-center px-4 py-2 rounded-2xl text-sm font-bold border-2 ${
                    getStatusColor(violation.status).bg
                  } ${getStatusColor(violation.status).text} shadow-lg`}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.div
                    className={`w-3 h-3 rounded-full mr-3 bg-gradient-to-r ${getStatusColor(violation.status).gradient}`}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  {violation.status || 'Undefined'}
                </motion.div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3 group">
                  <motion.div
                    className="p-2 bg-gradient-to-r from-emerald-400 to-green-500 rounded-lg shadow-md"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Car size={16} className="text-white" />
                  </motion.div>
                  <div className="flex-1">
                    <span className="text-sm text-slate-500">License Plate</span>
                    <p className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                      {violation.vehicle?.licensePlate || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 group">
                  <motion.div
                    className="p-2 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-lg shadow-md"
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Camera size={16} className="text-white" />
                  </motion.div>
                  <div className="flex-1">
                    <span className="text-sm text-slate-500">Camera</span>
                    <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {violation.camera?.name || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 group">
                  <motion.div
                    className="p-2 bg-gradient-to-r from-rose-400 to-pink-500 rounded-lg shadow-md"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <MapPin size={16} className="text-white" />
                  </motion.div>
                  <div className="flex-1">
                    <span className="text-sm text-slate-500">Location</span>
                    <p className="font-bold text-slate-800 group-hover:text-rose-600 transition-colors">
                      {violation.camera?.location || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 group">
                  <motion.div
                    className="p-2 bg-gradient-to-r from-purple-400 to-violet-500 rounded-lg shadow-md"
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Clock size={16} className="text-white" />
                  </motion.div>
                  <div className="flex-1">
                    <span className="text-sm text-slate-500">Date & Time</span>
                    <p className="font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
                      {violation.createdAt || 'Unknown'}
                    </p>
                  </div>
                </div>

                {violation.violationDetails?.[0]?.violationType && (
                  <div className="flex items-center space-x-3 group">
                    <motion.div
                      className="p-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg shadow-md"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <AlertTriangle size={16} className="text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <span className="text-sm text-slate-500">Violation Type</span>
                      <p className="font-bold text-slate-800 group-hover:text-amber-600 transition-colors">
                        {violation.violationDetails[0].violationType.typeName}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <motion.div 
                className="mt-6"
                whileHover={{ scale: 1.02 }}
              >
                <RequestButton violationId={violation.id} onStatusUpdate={handleStatusUpdate} />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default ViolationCustomerList;
