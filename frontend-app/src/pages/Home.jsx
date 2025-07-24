import React, { useState, useEffect } from "react";
import { Pencil, UserCircle } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import { useAuth } from "../components/AuthContext";

const COMMUNITY_SERVICE_URL = import.meta.env.VITE_COMMUNITY_SERVICE;

function UserDetails() {
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${COMMUNITY_SERVICE_URL}/api/community/user-details`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
      const token = localStorage.getItem("token");
      const res = await fetch(`${COMMUNITY_SERVICE_URL}/api/community/update-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    <div className={`mb-5 transition-all duration-300 ${editingField === fieldName ? 'bg-violet-50/80 rounded-lg shadow-md animate-fade-in' : ''}`}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1 font-sans">{label}</label>
      <div className="rounded-xl bg-white/80 border border-gray-200 shadow-sm px-4 py-3 flex items-center justify-between">
        {editingField === fieldName ? (
          <>
            <input
              type="text"
              value={tempValue}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white animate-fade-in font-sans"
            />
            <button
              onClick={handleFieldUpdate}
              className="ml-2 text-sm bg-violet-600 text-white px-3 py-1 rounded-lg font-semibold shadow transition-all duration-200 transform hover:bg-violet-700 hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              Save
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-800 text-sm font-sans">
              {user[fieldName] || <span className="text-gray-400 italic">Not provided</span>}
            </p>
            <Pencil
              size={20}
              className="text-gray-400 cursor-pointer transition-all duration-200 hover:text-violet-600 hover:scale-125 focus:scale-125 focus:text-violet-700 ml-2"
              onClick={() => handleEdit(fieldName)}
              tabIndex={0}
              aria-label={`Edit ${label}`}
            />
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-white to-cyan-100">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex flex-col lg:flex-row gap-8">
        {/* IMPORTANT NOTE - now on top for mobile, left for desktop */}
        <div className="w-full lg:w-1/3 order-1 lg:order-none bg-gradient-to-br from-violet-100 via-white to-cyan-100 border border-gray-200 rounded-2xl p-8 shadow-xl flex flex-col min-h-[260px] mb-4 lg:mb-0 animate-fade-in">
          <h2 className="text-lg font-semibold text-violet-800 mb-3 font-sans">📢 Important Note</h2>
          <ul className="list-disc ml-5 text-sm text-gray-700 space-y-2 font-sans">
            <li>This profile is publicly visible to others in the community.</li>
            <li>Be cautious while entering sensitive information.</li>
            <li>
              The <strong>Public Email</strong> you enter here is for display only.
              It <em>does not</em> replace your login email.
            </li>
          </ul>
        </div>

        {/* PROFILE FORM */}
        <div className="w-full lg:w-2/3 bg-white/90 rounded-2xl shadow-xl p-8 border border-gray-100 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-violet-700 mb-8 tracking-tight font-sans">
            Your Profile
          </h1>

          {loading ? (
            <p className="text-gray-500 font-sans">Loading profile...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
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
              </div>
              <button
                onClick={handleSaveAll}
                className="mt-10 w-full sm:w-auto bg-violet-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:bg-violet-700 hover:scale-105 hover:shadow-2xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-400 text-lg font-sans"
              >
                Save All & Commit
              </button>
            </>
          )}
        </div>
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

export default UserDetails;
