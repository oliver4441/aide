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
    <div className="flex items-center gap-2 px-4 py-2 text-xs font-display text-secondary">
      <span
        className={`w-2 h-2 border border-current ${online ? "border-accent text-accent" : "border-danger text-danger"}`}
      />
      {online ? "Online" : "Offline"}
    </div>
  );
}
