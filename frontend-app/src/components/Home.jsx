import React, { useState, useEffect, useRef } from "react";
import { UserCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";


function Home() {
  const [username, setUsername] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/verify-token", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) {
          setUsername(data.username);
        } else {
          setUsername("Guest");
        }
      } catch {
        setUsername("Guest");
      }
    };

    fetchUsername();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/logout", {
        method: "POST",
        credentials: "include",
      });
  
      const data = await res.json();
      if (res.ok) {
        toast.success("👋 Logged out successfully");
        setTimeout(() => navigate("/signin"), 1000); // Redirect after showing toast
      } else {
        toast.error(data.error || "Logout failed");
      }
    } catch (err) {
      toast.error("Server error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm py-4 px-8 flex justify-between items-center">
        <div className="text-2xl font-bold text-indigo-700">Stratify</div>

        <div className="flex items-center gap-6">
          <Link to="/register-community" className="text-gray-700 hover:text-indigo-600 transition font-medium">
            Register Community
          </Link>
          <Link to="/search-community" className="text-gray-700 hover:text-indigo-600 transition font-medium">
            Search Community
          </Link>
          <Link to="/details" className="text-gray-700 hover:text-indigo-600 transition font-medium">
            Details
          </Link>

          <div className="relative" ref={dropdownRef}>
  <button
    onClick={() => setDropdownOpen(!dropdownOpen)}
    className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-gray-100 transition"
  >
    <UserCircle className="text-indigo-600" size={28} />
    <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
      {username}
    </span>
  </button>

  {dropdownOpen && (
    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-md z-50">
      <button
        onClick={handleLogout}
        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
      >
        Logout
      </button>
    </div>
  )}
</div>
        </div>
      </nav>

      {/* Page Content */}
      <div className="flex flex-col items-center justify-center mt-20 space-y-6">
        <h2 className="text-3xl font-bold text-gray-800">Welcome to Stratify 👋</h2>
        <p className="text-gray-600">Use the navigation bar to get started.</p>
      </div>
    </div>
  );
}

export default Home;
