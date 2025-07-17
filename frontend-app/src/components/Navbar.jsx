// components/Navbar.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  UserCircle,
  Bell,
  HomeIcon,
  Users,
  PlusCircle,
  Search,
  Info,
  Menu,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function Navbar() {
  const [username, setUsername] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [notifCount, setNotifCount] = useState(0);

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
    // Fetch notifications and count non-system ones
    fetch("http://localhost:5003/api/notify/fetch", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const count = data.filter((n) => n.type !== "system").length;
          setNotifCount(count);
        }
      })
      .catch(() => setNotifCount(0));
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
        setTimeout(() => navigate("/signin"), 1000);
      } else {
        toast.error(data.error || "Logout failed");
      }
    } catch (err) {
      toast.error("Server error");
    }
  };

  const navLinks = [
    {
      to: "/home",
      label: "Home",
      icon: <HomeIcon size={20} />,
    },
    {
      to: "/your-communities",
      label: "Communities",
      icon: <Users size={20} />,
    },
    {
      to: "/notifications",
      label: "Notifications",
      icon: <Bell size={20} />,
    },
    {
      to: "/register-community",
      label: "Register",
      icon: <PlusCircle size={20} />,
    },
    {
      to: "/search-community",
      label: "Search",
      icon: <Search size={20} />,
    },
    {
      to: "/details",
      label: "Details",
      icon: <Info size={20} />,
    },
  ];

  return (
    <nav
      className="backdrop-blur-md bg-gradient-to-br from-violet-50 via-white to-cyan-50 shadow-xl w-full px-4 sm:px-10 py-3 flex justify-between items-center sticky top-0 z-50 border-b border-gray-100 transition-all"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="text-2xl font-extrabold text-violet-700 tracking-wide select-none flex items-center gap-2">
        <span className="bg-violet-50 px-2 py-1 rounded-lg shadow-sm">Stratify</span>
      </div>
      {/* Desktop Nav */}
      <div className="hidden lg:flex gap-2 xl:gap-6 items-center text-base font-medium text-gray-700">
        {navLinks.map((link) => (
          link.label === "Notifications" ? (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-violet-100 hover:text-violet-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-violet-400 relative"
              tabIndex={0}
              aria-label={link.label}
            >
              <span className="relative flex items-center">
                {link.icon}
                {notifCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                    {notifCount}
                  </span>
                )}
              </span>
              <span className="hidden md:inline">{link.label}</span>
            </Link>
          ) : (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-violet-100 hover:text-violet-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-violet-400"
              tabIndex={0}
              aria-label={link.label}
            >
              {link.icon} <span className="hidden md:inline">{link.label}</span>
            </Link>
          )
        ))}
      </div>
      {/* Mobile Hamburger */}
      <button
        className="lg:hidden flex items-center justify-center p-2 rounded-lg hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
        onClick={() => setMobileMenuOpen((v) => !v)}
        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
      >
        {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>
      {/* Profile Dropdown */}
      <div className="relative flex items-center gap-2 ml-2" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-violet-100 transition focus:outline-none focus:ring-2 focus:ring-violet-400"
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
        >
          <UserCircle className="text-violet-600" size={32} />
          <span className="bg-violet-50 text-violet-800 px-3 py-1 rounded-full text-sm font-semibold hidden sm:inline-block">
            {username}
          </span>
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 animate-fade-in flex flex-col items-stretch py-2">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-gray-700 hover:bg-violet-100 rounded-lg transition font-medium"
            >
              Logout
            </button>
          </div>
        )}
      </div>
      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="absolute top-0 right-0 h-full w-64 bg-gradient-to-br from-violet-50 via-white to-cyan-50 shadow-2xl p-6 flex flex-col gap-4 animate-slide-in rounded-l-2xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-bold text-violet-700">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-violet-100"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-violet-100 hover:text-violet-700 transition-all duration-150 text-base font-medium focus:outline-none focus:ring-2 focus:ring-violet-400"
                onClick={() => setMobileMenuOpen(false)}
                tabIndex={0}
                aria-label={link.label}
              >
                {link.icon} {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
      {/* Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.18s cubic-bezier(.4,0,.2,1);
        }
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.22s cubic-bezier(.4,0,.2,1);
        }
      `}</style>
    </nav>
  );
}

export default Navbar;
