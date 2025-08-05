// routes.jsx
import React from 'react';
import { Route, Routes } from 'react-router-dom';

import MapDashboard from '../Pages/Map/MapDashboard';
import RegisterPage from '../Pages/Auth/RegisterPage';
import ForgotPasswordPage from '../Pages/Auth/ForgotPasswordPage';
import UserDashboard from '../Pages/Dashboard/User/UserDashboard';
import AccidentDashboard from '../Pages/Dashboard/Accident/AccidentDashboard';

import ViolationList from '../Pages/Violations/ViolationList';
import ViolationHistory from '../Pages/Violations/ViolationHistory';

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
import VehicleTrackingDashboard from '../Pages/Dashboard/VehicleTraking/VehicleTrackingDashboard';
import AccidentStatistics from '../Pages/Dashboard/Accident/AccidentStatistics';
import ViolationStatistics from '../Pages/Violations/ViolationStatistics';
import UserTrafficMap from '../Pages/UserMap/UserTrafficMap';
import AccidentDetails from '../Pages/Dashboard/Accident/AccidentDetails';
import ViewAccidentDetails from '../Pages/Dashboard/Accident/ViewAccidentDetailsUser';
import AddVehicle from '../Pages/Vehicle/AddVehicle';
import EditVehicle from '../Pages/Vehicle/EditVehicle';
import ViolationCustomerList from '../Pages/Violations/ViolationCustomerList';
import VehicleCustomerList from '../Pages/Violations/VehicleCustomerList';
import ViolationDetailForUser from '../Pages/Violations/ViolationDetailForUser';





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
      <Route path="/tracks" element={<VehicleTrackingDashboard />} />
      <Route path="/accidentdashboard" element={<AccidentDashboard />} />
      <Route path="/accidents/:id" element={<AccidentDetails />} />
      <Route path="/accidentsdetails/:id" element={<ViewAccidentDetails />} />
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
      <Route path="/usermap" element={<UserTrafficMap />} />
      <Route path="/addv:id" element={<AddVehicle />} />
      <Route path="/editv" element={<EditVehicle />} />
      <Route path="/v" element={<ViolationCustomerList />} />
      <Route path="/vehiclelistuser" element={<VehicleCustomerList />} />
      <Route path="/violationsuser/:id" element={<ViolationDetailForUser />} />

    </Routes>
  );
};

export default RoutesConfig;