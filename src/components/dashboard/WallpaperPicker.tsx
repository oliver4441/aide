"use client";

import { useEffect, useState } from "react";
import {
  DASHBOARD_WALLPAPERS,
  DEFAULT_DASHBOARD_WALLPAPER,
  WALLPAPER_STORAGE_KEY,
  type DashboardWallpaperId,
} from "@/components/dashboard/DashboardWallpaper";

export default function WallpaperPicker() {
  const [selected, setSelected] = useState<DashboardWallpaperId>(DEFAULT_DASHBOARD_WALLPAPER);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(WALLPAPER_STORAGE_KEY);
      if (DASHBOARD_WALLPAPERS.some((wallpaper) => wallpaper.id === saved)) {
        setSelected(saved as DashboardWallpaperId);
      }
    } catch {
      // The default remains selected when local storage is unavailable.
    }
  }, []);

  const choose = (id: DashboardWallpaperId) => {
    setSelected(id);
    try {
      localStorage.setItem(WALLPAPER_STORAGE_KEY, id);
    } catch {
      // Keep the current choice for this session even if it cannot be saved.
    }
    window.dispatchEvent(new CustomEvent("aide:wallpaper-change", { detail: id }));
  };

  return (
    <div>
      <div className="mb-2 text-sm text-on-surface">Dashboard wallpaper</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="group" aria-label="Dashboard wallpaper">
        {DASHBOARD_WALLPAPERS.map((wallpaper) => (
          <button
            key={wallpaper.id}
            type="button"
            aria-pressed={selected === wallpaper.id}
            onClick={() => choose(wallpaper.id)}
            className={`overflow-hidden rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              selected === wallpaper.id ? "border-primary ring-2 ring-primary/30" : "border-outline-variant hover:border-primary/50"
            }`}
          >
            <span className="block aspect-[16/7] bg-cover bg-center" style={{ backgroundImage: `url("${wallpaper.src}")` }} />
            <span className="flex items-center justify-between gap-2 bg-surface-container-low px-3 py-2">
              <span className="text-sm font-medium text-on-surface">{wallpaper.name}</span>
              <span className="text-xs capitalize text-on-surface-variant">{wallpaper.tone}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-on-surface-variant">Saved on this device. Wallpapers are available offline.</p>
    </div>
  );
}
