import React, { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE;

function Register() {
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("success"); // "success" or "error"

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
  
    console.log("📤 Submitting form data:", formData);
  
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${USER_SERVICE_URL}/api/user/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });
  
      console.log("📥 Raw response:", res);
  
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error("❌ Failed to parse JSON:", jsonErr);
        throw new Error("Invalid JSON response from server.");
      }
  
      console.log("📦 Parsed response data:", data);
      setLoading(false);
  
      if (res.ok) {
        setMessageType("success");
        setMessage("✅ " + (data.message || "Registration successful"));
        setFormData({ username: "", email: "", password: "" });
      } else {
        setMessageType("error");
        setMessage("❌ " + (data.error || "Registration failed. Try again."));
      }
    } catch (err) {
      console.error("🚨 Fetch failed:", err);
      setLoading(false);
      setMessageType("error");
      setMessage("❌ Network or server error. Check console.");
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-cyan-100 flex justify-center items-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-indigo-600">Create Account</h2>
          <p className="text-gray-500 text-sm mt-1">Join Stratify today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="relative">
            <User className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              name="username"
              placeholder="Username"
              required
              value={formData.username}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
          </div>

          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
            <button
              type="button"
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition duration-300 flex justify-center items-center gap-2"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Register"}
          </button>
        </form>

        {/* Message */}
        {message && (
          <div
            className={`text-center text-sm p-2 rounded-md ${
              messageType === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* Link to Sign In */}
        <p className="text-center text-sm text-gray-600 mt-2">
          Already have an account?{" "}
          <Link to="/signin" className="text-indigo-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
