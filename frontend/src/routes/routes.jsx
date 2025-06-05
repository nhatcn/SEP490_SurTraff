// routes.jsx
import React from 'react';
import { Route , Routes} from 'react-router-dom';



import CameraDashboard from '../Pages/Dashboard/CameraDashboard';
import MapDashboard from '../Pages/Map/MapDashboard';
import TrafficMonitoringAuth from '../Pages/Auth/LoginPage';
import RegisterPage from '../Pages/Auth/RegisterPage';
import ForgotPasswordPage from '../Pages/Auth/ForgotPasswordPage';
import UserDashboard from '../Pages/Dashboard/UserDashboard';
import AddCameraDashboard from '../Pages/Dashboard/AddCamera';
import AccidentStatistics from '../Pages/Dashboard/AccidentStatistics';
import ViolationStatistics from '../Pages/Dashboard/ViolationStatistics';


const RoutesConfig = () => {
  return (
    <Routes>
        <Route path="/dashboard" element={<CameraDashboard/>} />

      <Route path="/map" element={<MapDashboard />} />
      <Route path="/login" element={<TrafficMonitoringAuth />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgotpassword" element={<ForgotPasswordPage />} />
      <Route path="/userdashboard" element={<UserDashboard />} />
      <Route path="/addcamera" element={<AddCameraDashboard />} />
      <Route path="/accidentstatistics" element={<AccidentStatistics />} />
      <Route path="/violationstatistics" element={<ViolationStatistics />} />
    </Routes>
  );
};

export default RoutesConfig;
