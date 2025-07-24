import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const location = useLocation();

  const userServiceUrl = import.meta.env.VITE_USER_SERVICE;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${userServiceUrl}/api/user/verify-token`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setIsAuthenticated(res.ok);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, [location, userServiceUrl]); // re-run on every route change

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
