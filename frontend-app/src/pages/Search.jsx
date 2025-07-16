import React, { useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import { Search, Info, UserPlus } from "lucide-react";

function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5002/api/community/search?q=${encodeURIComponent(query)}`,
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
      const res = await fetch("http://localhost:5002/api/community/join", {
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-md">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search communities..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={handleSearch}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <Search size={18} />
            Search
          </button>
        </div>

        {loading && <p className="mt-4 text-gray-500">Searching...</p>}

        {!loading && results.length > 0 && (
          <div className="mt-8 space-y-5">
            {results.map((comm, idx) => (
              <div
                key={idx}
                className="p-4 border border-gray-200 rounded-md shadow-sm flex justify-between items-center bg-gray-50 hover:shadow-md transition"
              >
                <div>
                  <h2 className="text-lg font-semibold text-indigo-800">{comm.name}</h2>
                  <p className="text-sm text-gray-600">
                    Level: {comm.level} | Created by: {comm.creator}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {comm.canJoin && (
                    <button
                      onClick={() => handleJoin(comm.name)}
                      className="text-indigo-600 hover:text-indigo-800"
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
          <p className="mt-6 text-gray-600 text-sm">No communities found for “{query}”.</p>
        )}
      </div>
    </div>
  );
}

export default SearchPage;
