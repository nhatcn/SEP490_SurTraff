// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { getCookie } from '../utils/cookieUltil';

interface ProtectedRouteProps {
  element: React.ReactElement;
  path: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, path }) => {
  const role = localStorage.getItem('role') || null;
  const userId = getCookie('userId') || null;
  const params = useParams<{ id?: string }>();

  // Define allowed routes for customers
  const customerAllowedRoutes = [
    '/login',
    '/register',
    '/forgotpassword',
    '/home',
    '/myprofile',
    '/usermap',
    '/vehiclelistuser',
    '/accidentsdetails/:id',
    '/violations/history/:plate',
    '/violationsuser/:id',
    '/editv/:id',
    '/addv'
  ];

  // Check if the current path is allowed for customers
  const isCustomerRouteAllowed = customerAllowedRoutes.includes(path);

  // Check if the route contains an :id parameter and if it matches the userId
  const isIdRoute = path.includes(':id');
  const isOwnId = isIdRoute && params.id === userId;

  if (role === 'customer') {
    // Allow access to customer-specific routes
    if (isCustomerRouteAllowed) {
      return element;
    }
    // For routes with :id, allow only if the id matches the user's id
    if (isIdRoute && isOwnId) {
      return element;
    }
    // Redirect to /home if customer tries to access unauthorized routes
    return <Navigate to="/home" replace />;
  }

  // For non-customer roles (e.g., admin), allow access to all routes
  return element;
};

export default ProtectedRoute;