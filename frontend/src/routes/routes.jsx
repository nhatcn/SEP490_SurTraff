// routes.jsx
import React from 'react';
import { Route, Routes } from 'react-router-dom';



import CameraDashboard from '../pages/Dashboard/Camera/CameraDashboard';
import MapDashboard from '../pages/Map/MapDashboard';
import TrafficMonitoringAuth from '../pages/Auth/LoginPage';
import RegisterPage from '../pages/Auth/RegisterPage';
import ForgotPasswordPage from '../pages/Auth/ForgotPasswordPage';
import UserDashboard from '../pages/Dashboard/User/UserDashboard';
import AddCameraDashboard from '../pages/Dashboard/Camera/AddCamera';
import AccidentDashboard from '../pages/Dashboard/Accident/AccidentDashboard';
import ViolationList from '../pages/Violations/ViolationList';
import ViolationDetail from '../pages/Violations/ViolationDetail';
import ViolationHistory from '../pages/Violations/ViolationHistory';
import EditCamera from '../pages/Dashboard/Camera/EditCamera';
import UserProfileDashboard from '../pages/Dashboard/User/UserProfileDashboard';


const RoutesConfig = () => {
  return (
    <Routes>
      <Route path="/dashboard" element={<CameraDashboard />} />
      <Route path="/cameras" element={<CameraDashboard />} />
      <Route path="/map" element={<MapDashboard />} />
      <Route path="/login" element={<TrafficMonitoringAuth />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgotpassword" element={<ForgotPasswordPage />} />
      <Route path="/userdashboard" element={<UserDashboard />} />
      <Route path="/addcamera" element={<AddCameraDashboard />} />
      <Route path="/accidentdashboard" element={<AccidentDashboard />} />
      <Route path="/cameras/edit/:id" element={<EditCamera />} />
      <Route path="/violations" element={<ViolationList />} />
      <Route path="/violations/:id" element={<ViolationDetail />} />
      <Route path="/violations/history/:plate" element={<ViolationHistory />} />
      <Route path="/profile" element={<UserProfileDashboard />} />
    </Routes>
  );
};

export default RoutesConfig;
