// routes.jsx
import React from 'react';
import { Route, Routes } from 'react-router-dom';

import MapDashboard from '../Pages/Map/MapDashboard';
import RegisterPage from '../Pages/Auth/RegisterPage';
import ForgotPasswordPage from '../Pages/Auth/ForgotPasswordPage';
import UserDashboard from '../Pages/Dashboard/User/UserDashboard';
import AccidentDashboard from '../Pages/Dashboard/Accident/AccidentDashboard';

import AccidentStatistics from '../Pages/Dashboard/AccidentStatistics';

import ViolationList from '../Pages/Violations/ViolationList';
import ViolationHistory from '../Pages/Violations/ViolationHistory';

import ViolationStatistics from '../Pages/Dashboard/ViolationStatistics';
import EditCamera from '../Pages/Dashboard/Camera/EditCamera';
import UserProfileDashboard from '../Pages/Dashboard/User/UserProfileDashboard';
import VehicleDashboard from '../Pages/Dashboard/Vehicle/VehicleDashboard';

import CameraDashboard from '../Pages/Dashboard/Camera/CameraDashboard';
import AddCamera from '../Pages/Dashboard/Camera/AddCamera';
import ViolationDetail from '../Pages/Violations/ViolationDetail';
import VehicleDetail from '../Pages/Dashboard/Vehicle/VehicleDetails';
import CustomerHome from '../Pages/Home/HomePage';
import CustomerProfile from '../Pages/Dashboard/User/CustomerProfile';
import LoginPage from '../Pages/Auth/LoginPage';




const RoutesConfig = () => {
  return (
    <Routes>
      <Route path="/dashboard" element={<CameraDashboard />} />
      <Route path="/cameras" element={<CameraDashboard />} />
      <Route path="/map" element={<MapDashboard />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgotpassword" element={<ForgotPasswordPage />} />
      <Route path="/userdashboard" element={<UserDashboard />} />
      <Route path="/addcamera" element={<AddCamera />} />
      <Route path="/accidentdashboard" element={<AccidentDashboard />} />
      <Route path="/cameras/edit/:id" element={<EditCamera />} />
      <Route path="/violations" element={<ViolationList />} />
      <Route path="/violations/:id" element={<ViolationDetail />} />
      <Route path="/violations/history/:plate" element={<ViolationHistory />} />
      <Route path="/profile" element={<UserProfileDashboard />} />
      <Route path="/accidentstatistics" element={<AccidentStatistics />} />
      <Route path="/violationstatistics" element={<ViolationStatistics />} />
      <Route path="/vehicledetails" element={<VehicleDetail/>} />
      <Route path="/vehicles" element={<VehicleDashboard />} />
      <Route path="/vehicles/:id" element={<VehicleDetail />} />
      <Route path="/home" element={<CustomerHome />} />
      <Route path="/myprofile" element={<CustomerProfile />} />
    </Routes>
  );
};

export default RoutesConfig;