import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import toast from "react-hot-toast";
import CommunityRender from "../components/communityRender";
import { Trash2 } from 'lucide-react';

function Communities() {
  const [communities, setCommunities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderNode, setLeaderNode] = useState(null);
  const [leaderLoading, setLeaderLoading] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("");
  const [deleteCommunity, setDeleteCommunity] = useState({ open: false, name: null });

  // Handler for delete community
  const handleDeleteCommunity = (name) => {
    setDeleteCommunity({ open: true, name });
  };
  const closeDeleteCommunity = () => setDeleteCommunity({ open: false, name: null });
  const confirmDeleteCommunity = async () => {
    if (!deleteCommunity.name) return;
    try {
      const res = await fetch("http://localhost:5002/api/community/delete-community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community: deleteCommunity.name }),
        credentials: "include"
      });
      if (res.ok) {
        toast.success("Community deleted.");
        setCommunities(communities.filter(c => c.name !== deleteCommunity.name));
        setSelected(null);
      } else {
        toast.error("Failed to delete community.");
      }
    } catch {
      toast.error("Failed to delete community.");
    }
    closeDeleteCommunity();
  };

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

  // Fetch leader node when a community is selected
  useEffect(() => {
    if (selected !== null && communities[selected]) {
      setLeaderLoading(true);
      setLeaderNode(null);
      fetch(`http://localhost:5002/api/community/leader-node-and-tree?community=${encodeURIComponent(communities[selected].name)}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setLeaderNode(data);
          } else {
            setLeaderNode(null);
            if (data && data.error) toast.error(data.error);
          }
        })
        .catch(() => {
          setLeaderNode(null);
          toast.error("Failed to load leader node");
        })
        .finally(() => setLeaderLoading(false));
    } else {
      setLeaderNode(null);
    }
  }, [selected, communities]);

  // Fetch current user's username
  useEffect(() => {
    fetch("http://localhost:5001/api/verify-token", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.username) setCurrentUsername(data.username);
        else setCurrentUsername("");
      })
      .catch(() => setCurrentUsername(""));
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
                    {/* Show delete button if current user is the leader, to the left of Level */}
                    {comm.leader_username === currentUsername && (
                      <button
                        className="ml-2 text-red-500 hover:text-red-700 p-1 rounded-full"
                        title="Delete community"
                        onClick={e => { e.stopPropagation(); handleDeleteCommunity(comm.name); }}
                        style={{ marginLeft: 0, marginRight: 4 }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <span className="ml-auto text-xs text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full">Level {comm.level}</span>
                  </div>
                  <div className="text-xs text-gray-500 font-sans pl-1">Leader: {comm.leader || <span className="italic text-gray-300">Unknown</span>}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Right: Community Tree */}
        <div className="hidden md:block w-3/4">
          {selected !== null ? (
            leaderLoading ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-lg font-sans animate-pulse">Loading Tree...</div>
            ) : (
              <CommunityRender
                leaderNode={leaderNode}
                communityName={communities[selected]?.name}
                currentUsername={currentUsername}
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-lg font-sans">Select a community to view its tree</div>
          )}
        </div>
      </div>
      {/* Delete community confirmation popup */}
      {deleteCommunity.open && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center gap-4 animate-fade-in-toolbar">
            <div className="text-lg font-semibold text-gray-800 mb-2">Are you sure you want to delete this community?</div>
            <div className="flex gap-4">
              <button
                className="bg-red-500 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-red-600 transition"
                onClick={confirmDeleteCommunity}
              >
                Yes
              </button>
              <button
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-bold shadow hover:bg-gray-400 transition"
                onClick={closeDeleteCommunity}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
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