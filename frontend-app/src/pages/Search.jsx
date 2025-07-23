import React, { useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import { Search, Info, UserPlus } from "lucide-react";

const COMMUNITY_SERVICE_URL = import.meta.env.VITE_COMMUNITY_SERVICE;

function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${COMMUNITY_SERVICE_URL}/api/community/search?q=${encodeURIComponent(query)}`,
        {
          credentials: "include",
        }
      );
      const data = await res.json();
      if (res.ok) {
        setResults(data);
      } else {
        toast.error(data.error || "Failed to fetch communities.");
      }
    } catch {
      toast.error("Server error during search.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (communityName) => {
    try {
      const res = await fetch(`${COMMUNITY_SERVICE_URL}/api/community/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ community: communityName }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Request sent to join "${communityName}"`);
      } else {
        toast.error(data.error || "Failed to send join request");
      }
    } catch {
      toast.error("Server error while joining");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-white to-cyan-100">
      <Navbar />

      <div className="max-w-4xl mx-auto mt-12 p-8 bg-white/90 rounded-2xl shadow-xl border border-gray-100 animate-fade-in">
        <h2 className="text-2xl font-bold mb-8 text-violet-700 tracking-tight font-sans flex items-center gap-2">
          <Search size={26} className="text-violet-400" />
          Search Communities
        </h2>
        <div className="flex items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search communities..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400 font-sans text-base transition-all"
          />
          <button
            onClick={handleSearch}
            className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:from-violet-700 hover:to-cyan-600 hover:scale-105 hover:shadow-2xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-400 flex items-center gap-2"
          >
            <Search size={18} />
            Search
          </button>
        </div>

        {loading && <p className="mt-4 text-gray-500 font-sans">Searching...</p>}

        {!loading && results.length > 0 && (
          <div className="mt-8 space-y-5">
            {results.map((comm, idx) => (
              <div
                key={idx}
                className="p-5 border border-gray-100 rounded-xl shadow-md bg-gradient-to-br from-white via-violet-50 to-cyan-50 flex justify-between items-center transition-all duration-200 hover:shadow-lg hover:border-violet-200"
              >
                <div>
                  <h2 className="text-lg font-semibold text-violet-700 font-sans mb-1">{comm.name}</h2>
                  <p className="text-sm text-gray-600 font-sans">
                    Level: {comm.level} | Created by: {comm.creator}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {comm.canJoin && (
                    <button
                      onClick={() => handleJoin(comm.name)}
                      className="text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 rounded-full p-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      title="Request to join"
                    >
                      <UserPlus size={20} />
                    </button>
                  )}
                  <div title={comm.motto} className="text-gray-500 cursor-help">
                    <Info size={20} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <p className="mt-6 text-gray-400 text-center text-lg font-sans">No communities found for “{query}”.</p>
        )}
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

export default SearchPage;
