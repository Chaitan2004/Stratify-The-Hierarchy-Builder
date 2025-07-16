import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import { Check, X } from "lucide-react"; // ✅ Lucide icons

function Notifications() {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5003/api/notify/fetch", {
      credentials: "include",
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
      const res = await fetch("http://localhost:5002/api/community/join-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-indigo-700">Notifications</h2>
        {notifs.length === 0 ? (
          <p className="text-gray-500">No notifications</p>
        ) : (
          notifs.map((notif, idx) => (
            <div
              key={idx}
              className="mb-4 p-4 border rounded shadow-sm bg-gray-50 flex justify-between items-center"
            >
              <div>
                <p className="text-sm text-gray-700">{notif.message}</p>
                <p className="text-xs text-gray-400">
                  {new Date(notif.timestamp).toLocaleString()}
                </p>
              </div>
              {notif.type === "join_request" && (
                <div className="flex gap-2">
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center"
                    onClick={() => handleDecision("accept", notif)}
                    title="Accept"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center"
                    onClick={() => handleDecision("reject", notif)}
                    title="Reject"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Notifications;
