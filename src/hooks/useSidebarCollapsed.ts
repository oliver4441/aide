"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "aide_sidebar_collapsed";
const TOGGLE_EVENT = "aide-sidebar-toggle";

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

/**
 * Shared collapsed-state for the desktop sidebar. The Sidebar owns the toggle;
 * the dashboard layout listens for the custom event so the content margin
 * follows without lifting state into a parent.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed());
    const handler = () => setCollapsed(readCollapsed());
    window.addEventListener(TOGGLE_EVENT, handler);
    return () => window.removeEventListener(TOGGLE_EVENT, handler);
  }, []);

  const toggle = useCallback(() => {
    const next = !readCollapsed();
    localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new Event(TOGGLE_EVENT));
  }, []);

  return { collapsed, toggle };
}
