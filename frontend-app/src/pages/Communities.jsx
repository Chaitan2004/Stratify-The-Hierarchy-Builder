import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import toast from "react-hot-toast";

function Communities() {
  const [communities, setCommunities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:5002/api/community/my-communities", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCommunities(data);
        } else {
          setCommunities([]);
          if (data && data.error) toast.error(data.error);
        }
      })
      .catch(() => {
        setCommunities([]);
        toast.error("Failed to load communities");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-white to-cyan-100">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 flex gap-8">
        {/* Left: Communities List */}
        <div className="w-full md:w-1/4 bg-white/90 rounded-2xl shadow-xl border border-gray-100 p-4 h-[70vh] overflow-y-auto animate-fade-in">
          <h2 className="text-lg font-bold text-violet-700 mb-4 font-sans">Your Communities</h2>
          {loading ? (
            <p className="text-gray-500 font-sans">Loading...</p>
          ) : communities.length === 0 ? (
            <p className="text-gray-400 font-sans">No communities found.</p>
          ) : (
            <ul className="space-y-2">
              {communities.map((comm, idx) => (
                <li
                  key={comm.name + idx}
                  className={`p-3 rounded-lg cursor-pointer transition-all font-sans flex flex-col gap-1 border border-transparent hover:border-violet-300 hover:bg-violet-50 ${selected === idx ? "bg-violet-100 border-violet-400" : ""}`}
                  onClick={() => setSelected(idx)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{comm.name}</span>
                    <span className="ml-auto text-xs text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full">Level {comm.level}</span>
                  </div>
                  <div className="text-xs text-gray-500 font-sans pl-1">Leader: {comm.leader || <span className="italic text-gray-300">Unknown</span>}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Right: Community Tree (empty for now) */}
        <div className="hidden md:block w-3/4"></div>
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

export default Communities; 