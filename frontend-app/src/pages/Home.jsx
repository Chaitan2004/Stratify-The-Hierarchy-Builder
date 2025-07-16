import React, { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import { useAuth } from "../components/AuthContext";

function UserDetails() {
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:5002/api/community/user-details", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) {
          setUser(data || {});
        } else {
          toast.error(data.error || "Failed to load profile");
        }
      } catch {
        toast.error("Server error while loading profile");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEdit = (field) => {
    setEditingField(field);
    setTempValue(user[field] || "");
  };

  const handleChange = (e) => {
    setTempValue(e.target.value);
  };

  const handleFieldUpdate = () => {
    setUser({ ...user, [editingField]: tempValue });
    setEditingField(null);
  };

  const handleSaveAll = async () => {
    if (!isAuthenticated) {
      toast.error("You must be logged in to update your profile.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5002/api/community/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(user),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Profile updated successfully");
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch {
      toast.error("Server error while saving");
    }
  };

  const renderField = (label, fieldName) => (
    <div className="mb-5">
      <label className="text-sm font-semibold text-gray-600 block mb-1">{label}</label>
      {editingField === fieldName ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={tempValue}
            onChange={handleChange}
            className="border border-gray-300 rounded px-3 py-2 w-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            onClick={handleFieldUpdate}
            className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition"
          >
            Save
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <p className="text-gray-800 text-sm">
            {user[fieldName] || <span className="text-gray-400 italic">Not provided</span>}
          </p>
          <Pencil
            size={18}
            className="text-gray-500 cursor-pointer hover:text-indigo-600 transition"
            onClick={() => handleEdit(fieldName)}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-12 flex gap-10">
        {/* LEFT COLUMN */}
        <div className="w-full lg:w-2/3">
          <h1 className="text-4xl font-bold text-gray-800 mb-6 tracking-tight">
            🧾 Your Profile
          </h1>

          {loading ? (
            <p className="text-gray-500">Loading profile...</p>
          ) : (
            <>
              {renderField("Full Name", "name")}
              {renderField("Public Email", "public_email")}
              {renderField("Date of Birth", "dob")}
              {renderField("Age", "age")}
              {renderField("Phone Number", "phone")}
              {renderField("Gender", "gender")}
              {renderField("Location", "location")}
              {renderField("Bio", "bio")}
              {renderField("LinkedIn", "linkedin")}
              {renderField("GitHub", "github")}
              {renderField("Twitter", "twitter")}
              {renderField("Website", "website")}

              <button
                onClick={handleSaveAll}
                className="mt-8 bg-indigo-600 text-white px-6 py-2 rounded font-semibold hover:bg-indigo-700 transition"
              >
                Save All & Commit
              </button>
            </>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="hidden lg:block w-1/3 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-indigo-800 mb-2">📢 Important Note</h2>
          <ul className="list-disc ml-5 text-sm text-gray-700 space-y-2">
            <li>This profile is publicly visible to others in the community.</li>
            <li>Be cautious while entering sensitive information.</li>
            <li>
              The <strong>Public Email</strong> you enter here is for display only.
              It <em>does not</em> replace your login email.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default UserDetails;
