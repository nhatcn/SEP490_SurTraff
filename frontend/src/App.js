import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import RoutesConfig from './routes/routes.jsx'; 

import 'bootstrap/dist/css/bootstrap.min.css';  

const App = () => {
  return (
    <Router>

  
    
        <RoutesConfig />
      
    
    </Router>
  );
};

export default App;
