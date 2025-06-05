// routes.jsx
import React from 'react';
import { Route, Routes } from 'react-router-dom';



import CameraDashboard from '../Pages/Dashboard/Camera/CameraDashboard';
import MapDashboard from '../Pages/Map/MapDashboard';
import TrafficMonitoringAuth from '../Pages/Auth/LoginPage';
import RegisterPage from '../Pages/Auth/RegisterPage';
import ForgotPasswordPage from '../Pages/Auth/ForgotPasswordPage';
import UserDashboard from '../Pages/Dashboard/User/UserDashboard';
import AddCameraDashboard from '../Pages/Dashboard/Camera/AddCamera';
import AccidentDashboard from '../Pages/Dashboard/Accident/AccidentDashboard';
import ViolationList from '../Pages/Violations/ViolationList';
import ViolationDetail from '../Pages/Violations/ViolationDetail';
import ViolationHistory from '../Pages/Violations/ViolationHistory';
import EditCamera from '../Pages/Dashboard/Camera/EditCamera';
import UserProfileDashboard from '../Pages/Dashboard/User/UserProfileDashboard';


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
