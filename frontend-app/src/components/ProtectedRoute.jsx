// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated === null) {
    return <div className="text-center mt-10 text-gray-500">Checking authenticity...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" />;
  }

  return children;
}

export default ProtectedRoute;
