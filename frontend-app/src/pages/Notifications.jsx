import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import { Check, X } from "lucide-react"; // ✅ Lucide icons

const NOTIFICATION_SERVICE_URL = import.meta.env.VITE_NOTIFICATION_SERVICE;
const COMMUNITY_SERVICE_URL = import.meta.env.VITE_COMMUNITY_SERVICE;

function Notifications() {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${NOTIFICATION_SERVICE_URL}/api/notify/fetch`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifs(data);
        } else {
          setNotifs([]);
          if (data && data.error) {
            toast.error(data.error);
          }
        }
      })
      .catch(() => {
        setNotifs([]);
        toast.error("Failed to load notifications");
      });
  }, []);

  const extractInfo = (message) => {
    const match = message.match(/(.*?) requested to join your community '(.*?)'/);
    if (match) {
      const [, username, community] = match;
      return { username, community };
    }
    return { username: null, community: null };
  };

  const handleDecision = async (type, notif) => {
    const { username, community } = extractInfo(notif.message);

    if (!username || !community) {
      toast.error("Invalid notification format");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${COMMUNITY_SERVICE_URL}/api/community/join-response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requester: notif.sender,
          community,
          decision: type,
          requester_email: notif.sender_email
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setNotifs((prev) => prev.filter((n) => n !== notif));
      } else {
        toast.error(data.error || "Error processing request");
      }
    } catch {
      toast.error("Server error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-white to-cyan-100">
      <Navbar />

      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white/90 rounded-2xl shadow-xl border border-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-violet-700 tracking-tight font-sans">Notifications</h2>
        {notifs.length === 0 ? (
          <p className="text-gray-400 text-center text-lg font-sans">No notifications</p>
        ) : (
          <div className="space-y-5">
            {notifs.map((notif, idx) => (
              <div
                key={idx}
                className="group mb-2 p-5 border border-gray-100 rounded-xl shadow-md bg-gradient-to-br from-white via-violet-50 to-cyan-50 flex justify-between items-center transition-all duration-200 hover:shadow-lg hover:border-violet-200"
              >
                <div>
                  <p className="text-base text-gray-800 font-medium font-sans mb-1">{notif.message}</p>
                  <p className="text-xs text-gray-400 font-sans">
                    {new Date(notif.timestamp).toLocaleString()}
                  </p>
                </div>
                {notif.type === "join_request" && (
                  <div className="flex gap-2 ml-4">
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white w-9 h-9 rounded-full flex items-center justify-center shadow transition-all duration-150 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-300"
                      onClick={() => handleDecision("accept", notif)}
                      title="Accept"
                    >
                      <Check size={20} />
                    </button>
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white w-9 h-9 rounded-full flex items-center justify-center shadow transition-all duration-150 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-300"
                      onClick={() => handleDecision("reject", notif)}
                      title="Reject"
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
