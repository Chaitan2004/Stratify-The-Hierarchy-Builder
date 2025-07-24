import React, { useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import { Users } from "lucide-react";

const COMMUNITY_SERVICE_URL = import.meta.env.VITE_COMMUNITY_SERVICE;

function Registercommunity() {
  const [community, setCommunity] = useState({ name: "", level: "", motto: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setCommunity({ ...community, [e.target.name]: e.target.value });
  };

  const getCommunitySizeInfo = (level) => {
    switch (level) {
      case "1":
        return "👥 Max size: 10 members (under development max size is unlimited)";
      case "2":
        return "👥 Max size: 20 members (under development max size is unlimited)";
      case "3":
        return "👥 Max size: 30 members (under development max size is unlimited)";
      case "4":
        return "👥 Max size: Unlimited members";
      default:
        return "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${COMMUNITY_SERVICE_URL}/api/community/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(community),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Community registered successfully!");
        setCommunity({ name: "", level: "", motto: "" });
      } else {
        toast.error(data.error || "Failed to register community");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-white to-cyan-100">
      <Navbar />
      <div className="max-w-xl mx-auto mt-12 p-8 bg-white/90 rounded-2xl shadow-xl border border-gray-100 animate-fade-in transition-all duration-200 hover:shadow-2xl hover:border-violet-200">
        <div className="flex items-center gap-3 mb-2">
          <Users size={28} className="text-violet-400" />
          <h2 className="text-2xl font-bold text-violet-700 tracking-tight font-sans">Register a New Community</h2>
        </div>
        <div className="h-1 w-16 bg-gradient-to-r from-violet-400 to-cyan-400 rounded-full mb-7" />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 font-sans">Community Name</label>
            <input
              type="text"
              name="name"
              value={community.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400 font-sans text-base transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 font-sans">Community Level</label>
            <select
              name="level"
              value={community.level}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400 font-sans text-base transition-all"
            >
              <option value="">Select level</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
            </select>
            {community.level && (
              <p className="text-sm text-violet-600 mt-1 font-sans">{getCommunitySizeInfo(community.level)}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 font-sans">Community Motto</label>
            <input
              type="text"
              name="motto"
              value={community.motto}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400 font-sans text-base transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:from-violet-700 hover:to-cyan-600 hover:scale-105 hover:shadow-2xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-400 text-lg font-sans flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">Registering...</span>
            ) : (
              <>
                <Users size={20} className="inline-block text-white/80" />
                Register Community
              </>
            )}
          </button>
        </form>
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

export default Registercommunity;
