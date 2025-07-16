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
    <>
      <Navbar />
      <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
        <h2 className="text-2xl font-semibold mb-6 text-indigo-700">Account Details</h2>

        {/* Removed email input box */}

        <div className="mb-6">
          <label className="block font-medium">Username</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded"
            />
            <button
              onClick={updateUsername}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Update
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block font-medium">Current Password</label>
          <input
            type="password"
            value={passwords.current}
            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
            className="mt-1 w-full px-3 py-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block font-medium">New Password</label>
          <input
            type="password"
            value={passwords.new}
            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
            className="mt-1 w-full px-3 py-2 border rounded"
          />
        </div>

        <button
          onClick={updatePassword}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Update Password
        </button>
      </div>
    </>
  );
}

export default Details;
