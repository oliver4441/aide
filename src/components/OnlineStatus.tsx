"use client";

import { useState, useEffect } from "react";

export default function OnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-on-surface-variant">
      <span
        className={`w-2 h-2 rounded-full ${online ? "bg-success" : "bg-danger"}`}
      />
      {online ? "Online" : "Offline — changes will sync later"}
    </div>
  );
}
