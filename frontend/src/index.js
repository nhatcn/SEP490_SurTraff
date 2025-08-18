import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import App from "./App"
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap/dist/js/bootstrap.bundle.min.js"

// Override fetch để tự động thêm ngrok header
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  const ngrokHeaders = {
    'ngrok-skip-browser-warning': '69420',
    ...options.headers
  };

  return originalFetch(url, {
    ...options,
    headers: ngrokHeaders
  });
};

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)