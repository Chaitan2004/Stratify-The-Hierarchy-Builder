import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./components/AuthContext"; 
import { BrowserRouter as Router } from "react-router-dom";



createRoot(document.getElementById('root')).render(
  <Router>
  <AuthProvider>
  <StrictMode>
    <App />
    <Toaster position="top-center" reverseOrder={false} />
  </StrictMode>
  </AuthProvider>
  </Router>
)
