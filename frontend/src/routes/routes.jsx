// routes.jsx
import React from 'react';
import { Route , Routes} from 'react-router-dom';


import LoginPage from '../Pages/Auth/LoginPage';
import CameraDashboard from '../components/CameraDashboard';
import MapDashboard from '../Pages/Map/Map';


const RoutesConfig = () => {
  return (
    <Routes>
        <Route path="/dashboard" element={<CameraDashboard/>} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/map" element={<MapDashboard />} />
    </Routes>
  );
};

export default RoutesConfig;
