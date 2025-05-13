// routes.jsx
import React from 'react';
import { Route , Routes} from 'react-router-dom';



import CameraDashboard from '../components/CameraDashboard';
import MapDashboard from '../Pages/Map/Map';
import TrafficMonitoringAuth from '../Pages/Auth/LoginPage';
import RegisterPage from '../Pages/Auth/RegisterPage';
import ForgotPasswordPage from '../Pages/Auth/ForgotPasswordPage';


const RoutesConfig = () => {
  return (
    <Routes>
        <Route path="/dashboard" element={<CameraDashboard/>} />

      <Route path="/map" element={<MapDashboard />} />
      <Route path="/login" element={<TrafficMonitoringAuth />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgotpassword" element={<ForgotPasswordPage />} />
    </Routes>
  );
};

export default RoutesConfig;
