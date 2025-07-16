import React, { useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import { useAuth } from "../components/AuthContext";

function RegisterCommunity() {
  const { isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    name: "",
    level: "",
    motto: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error("⚠️ You must be logged in to create a community.");
      return;
    }

    const { name, level, motto } = form;
    if (!name || !level || !motto) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5002/api/community/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("🎉 Community registered!");
        setForm({ name: "", level: "", motto: "" });
      } else {
        toast.error(data.error || "Failed to register community");
      }
    } catch (err) {
      toast.error("Server error. Please try again.");
    }
  };

  const getCommunitySizeInfo = (level) => {
    switch (level) {
      case "1":
        return "👥 Max size: 10 members";
      case "2":
        return "👥 Max size: 20 members";
      case "3":
        return "👥 Max size: 30 members";
      case "4":
        return "👥 Max size: Unlimited members";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-100">
      <Navbar />
      <div className="max-w-xl mx-auto mt-12 p-8 bg-white shadow-2xl rounded-2xl border border-gray-200">
        <h1 className="text-3xl font-bold mb-6 text-indigo-800">Register a Community</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600">Community Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full mt-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-400"
              placeholder="Enter community name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Community Level</label>
            <select
              name="level"
              value={form.level}
              onChange={handleChange}
              className="w-full mt-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Select level</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
            </select>
            {form.level && (
              <p className="text-sm text-indigo-600 mt-1">
                {getCommunitySizeInfo(form.level)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Community Motto</label>
            <input
              type="text"
              name="motto"
              value={form.motto}
              onChange={handleChange}
              className="w-full mt-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-400"
              placeholder="What's your community about?"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-200"
          >
            Create Community
          </button>
        </form>
      </div>
    </div>
  );
}

export default RegisterCommunity;
