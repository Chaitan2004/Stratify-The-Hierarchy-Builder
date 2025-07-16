import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

function Details() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [passwords, setPasswords] = useState({ current: "", new: "" });
  const navigate = useNavigate();

  // Fetch user info on load
  useEffect(() => {
    fetch("http://localhost:5001/api/user/me", {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setEmail(data.email);
        setUsername(data.username);
        setNewUsername(data.username);
      })
      .catch(() => toast.error("Failed to load user info"));
  }, []);

  const updateUsername = async () => {
    if (!newUsername || newUsername === username) {
      toast.error("Enter a new username");
      return;
    }

    try {
      const res = await fetch("http://localhost:5001/api/user/update-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: newUsername }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.redirect) {
          toast.success(data.message || "Username updated, please log in again.");
          setTimeout(() => navigate(data.redirect_url || "/signin"), 1200);
          return;
        }
        setUsername(newUsername);
        toast.success("Username updated");
      } else {
        toast.error(data.error || "Failed to update username");
      }
    } catch {
      toast.error("Server error");
    }
  };

  const updatePassword = async () => {
    if (!passwords.current || !passwords.new) {
      toast.error("Both password fields required");
      return;
    }

    try {
      const res = await fetch("http://localhost:5001/api/user/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(passwords),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.redirect) {
          toast.success(data.message || "Password updated, please log in again.");
          setTimeout(() => navigate(data.redirect_url || "/signin"), 1200);
          return;
        }
        setPasswords({ current: "", new: "" });
        toast.success("Password updated");
      } else {
        toast.error(data.error || "Failed to update password");
      }
    } catch {
      toast.error("Server error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-white to-cyan-100">
      <Navbar />
      <div className="max-w-xl mx-auto mt-12 p-8 bg-white/90 rounded-2xl shadow-xl border border-gray-100 animate-fade-in">
        <h2 className="text-2xl font-bold mb-8 text-violet-700 tracking-tight font-sans">Account Details</h2>
        {/* Removed email input box */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 font-sans">Username</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-sans text-base transition-all"
            />
            <button
              onClick={updateUsername}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:bg-blue-700 hover:scale-105 hover:shadow-2xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base font-sans"
            >
              Update
            </button>
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 font-sans">Current Password</label>
          <input
            type="password"
            value={passwords.current}
            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 font-sans text-base transition-all"
          />
        </div>
        <div className="mb-8">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 font-sans">New Password</label>
          <input
            type="password"
            value={passwords.new}
            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 font-sans text-base transition-all"
          />
        </div>
        <button
          onClick={updatePassword}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:bg-green-700 hover:scale-105 hover:shadow-2xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-400 text-lg font-sans"
        >
          Update Password
        </button>
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s cubic-bezier(.4,0,.2,1);
        }
      `}</style>
    </div>
  );
}

export default Details;
