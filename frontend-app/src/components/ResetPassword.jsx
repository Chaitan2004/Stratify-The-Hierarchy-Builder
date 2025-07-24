import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!token) {
      setMessage("Invalid or missing token.");
      return;
    }
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const localToken = localStorage.getItem("token");
      const res = await fetch(`${USER_SERVICE_URL}/api/user/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(localToken ? { Authorization: `Bearer ${localToken}` } : {}),
        },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setMessage("Password reset successful! Redirecting to login...");
        setTimeout(() => navigate("/signin"), 2000);
      } else {
        setMessage(data.error || "Failed to reset password.");
      }
    } catch {
      setLoading(false);
      setMessage("Server error.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-cyan-100 px-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-center text-blue-600">Reset Password</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="password"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Confirm new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 text-white font-semibold rounded-lg transition duration-300 transform active:scale-95 ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
        {message && <p className="text-center text-sm text-gray-700 mt-2">{message}</p>}
      </div>
    </div>
  );
} 