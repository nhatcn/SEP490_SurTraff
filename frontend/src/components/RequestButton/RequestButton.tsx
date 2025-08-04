import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';

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

interface RequestButtonProps {
  violationId: number;
  onStatusUpdate: (updatedViolation: ViolationsDTO) => void;
}

const RequestButton: React.FC<RequestButtonProps> = ({ violationId, onStatusUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [violationStatus, setViolationStatus] = useState<string | null>(null);

  // Fetch violation status on mount
  useEffect(() => {
    const fetchViolationStatus = async () => {
      try {
        const response = await axios.get<ViolationsDTO>(
          `http://localhost:8081/api/violations/${violationId}`,
          {
            headers: {
              Accept: 'application/json',
            },
          }
        );
        setViolationStatus(response.data.status?.toUpperCase() || null);
      } catch (err) {
        console.error('Error fetching violation status:', err);
        setViolationStatus(null);
      }
    };
    fetchViolationStatus();
  }, [violationId]);

  // Reset success/error state after 3 seconds
  useEffect(() => {
    if (success !== null || error !== null) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleRequest = async () => {
    setIsLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const response = await axios.patch<ViolationsDTO>(
        `http://localhost:8081/api/violations/${violationId}/status`,
        null,
        {
          params: {
            status: 'REQUEST',
          },
          headers: {
            Accept: 'application/json',
          },
        }
      );
      onStatusUpdate(response.data);
      setViolationStatus(response.data.status?.toUpperCase() || 'REQUEST');
      setSuccess(true);
    } catch (err) {
      const error = err as AxiosError;
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
        request: {
          url: error.config?.url,
          params: error.config?.params,
          headers: error.config?.headers,
        },
      });
      if (error.response?.status === 404) {
        setError((error.response?.data as any)?.message || 'Violation not found.');
      } else if (error.response?.status === 400) {
        setError(
          (error.response?.data as any)?.message ||
            'Invalid status. Valid statuses: PENDING, REQUEST, RESOLVED, DISMISSED, APPROVE, REJECT.'
        );
      } else {
        setError((error.response?.data as any)?.message || 'An error occurred. Please try again.');
      }
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine button text and disabled state
  const isRequestAllowed = violationStatus === 'PENDING';
  const buttonText = isLoading
    ? 'Processing...'
    : success === true
    ? 'Success'
    : success === false
    ? 'Failed'
    : violationStatus === 'APPROVE'
    ? 'Approved'
    : violationStatus === 'REJECT'
    ? 'Rejected'
    : violationStatus === 'REQUEST'
    ? 'Requested'
    : violationStatus === 'RESOLVED'
    ? 'Resolved'
    : violationStatus === 'DISMISSED'
    ? 'Dismissed'
    : 'Send Request';

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleRequest}
        disabled={isLoading || !isRequestAllowed}
        className={`
          relative px-6 py-3 rounded-lg font-semibold text-white 
          ${success === true ? 'bg-green-600 hover:bg-green-700' : 
            success === false ? 'bg-red-600 hover:bg-red-700' : 
            !isRequestAllowed ? 'bg-gray-600 hover:bg-gray-700' : 
            'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}
          transition-all duration-300 ease-in-out
          transform hover:scale-105 hover:shadow-xl
          disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed
          ${isLoading ? 'animate-pulse' : ''}
        `}
      >
        {isLoading ? (
          <span className="flex items-center">
            <svg
              className="animate-spin h-5 w-5 mr-2 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {buttonText}
          </span>
        ) : (
          buttonText
        )}
      </button>
      {error && (
        <p className="text-red-400 text-sm mt-3 opacity-0 animate-[fade-in_0.3s_ease-in-out_forwards]">
          {error}
        </p>
      )}
    </div>
  );
};

export default RequestButton;