// App.jsx hoặc App.tsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import RoutesConfig from './routes/routes.jsx'; 

import 'bootstrap/dist/css/bootstrap.min.css';  
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "359834252791-bdrg125j62411mp1u8suqqnl6v79339a.apps.googleusercontent.com";

const App = () => {
  return (
    <Router>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <RoutesConfig />
      </GoogleOAuthProvider>
    </Router>
  );
};

export default App;
