// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/verify-token", {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // ⏳ Still checking
  if (isAuthenticated === null) {
    return <div className="text-center mt-10 text-gray-500">Checking authenticity...</div>;
  }

  // ❌ Not logged in
  if (!isAuthenticated) {
    return <Navigate to="/signin" />;
  }

  // ✅ Logged in
  return children;
}

export default ProtectedRoute;
