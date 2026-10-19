"use client";

import { useEffect } from "react";

export const WALLPAPER_STORAGE_KEY = "aide_dashboard_wallpaper";

export const DASHBOARD_WALLPAPERS = [
  { id: "dusk-lake", name: "Dusk lake", tone: "dark", src: "/wallpapers/dusk-lake.jpg" },
  { id: "forest-canopy", name: "Forest canopy", tone: "dark", src: "/wallpapers/forest-canopy.jpg" },
  { id: "tea-highlands", name: "Tea highlands", tone: "light", src: "/wallpapers/tea-highlands.jpg" },
] as const;

export type DashboardWallpaperId = (typeof DASHBOARD_WALLPAPERS)[number]["id"];
export const DEFAULT_DASHBOARD_WALLPAPER: DashboardWallpaperId = "dusk-lake";

/** Scrim alpha pair per wallpaper tone, per theme. */
const SCRIM: Record<"dark" | "light", { dark: [number, number]; light: [number, number] }> = {
  dark: { dark: [0.14, 0.18], light: [0.46, 0.5] },
  light: { dark: [0.4, 0.42], light: [0.22, 0.26] },
};

function getWallpaper(id: string) {
  return DASHBOARD_WALLPAPERS.find((wallpaper) => wallpaper.id === id) ?? DASHBOARD_WALLPAPERS[0];
}

export default function DashboardWallpaper() {
  useEffect(() => {
    const previous = {
      image: document.body.style.backgroundImage,
      color: document.body.style.backgroundColor,
      size: document.body.style.backgroundSize,
      position: document.body.style.backgroundPosition,
      attachment: document.body.style.backgroundAttachment,
      repeat: document.body.style.backgroundRepeat,
    };

    const apply = (id: string) => {
      const wallpaper = getWallpaper(id);
      const isDark = document.documentElement.classList.contains("dark");
      // The scrim has to flex with the photo: a dark picture under a heavy wash
      // flattens to near-black, a bright one under a light wash blows out the
      // text. `tone` is set per wallpaper, so dark photos get a barely-there
      // scrim on the dark theme and bright ones get enough to keep contrast.
      const [top, bottom] = SCRIM[wallpaper.tone][isDark ? "dark" : "light"];
      const scrim = isDark ? "10, 12, 18" : "247, 247, 250";
      const overlay = `rgba(${scrim}, ${top}), rgba(${scrim}, ${bottom})`;
      document.body.style.backgroundImage = `linear-gradient(${overlay}), url("${wallpaper.src}")`;
      document.body.style.backgroundColor = isDark ? "#121217" : "#f9f9ff";
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundAttachment = "fixed";
      document.body.style.backgroundRepeat = "no-repeat";
    };

    let selected = DEFAULT_DASHBOARD_WALLPAPER as string;
    try {
      selected = localStorage.getItem(WALLPAPER_STORAGE_KEY) ?? selected;
    } catch {
      // Keep the default wallpaper when local storage is unavailable.
    }
    apply(selected);

    const handleWallpaperChange = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      selected = id;
      apply(id);
    };
    window.addEventListener("aide:wallpaper-change", handleWallpaperChange);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== WALLPAPER_STORAGE_KEY) return;
      selected = event.newValue ?? DEFAULT_DASHBOARD_WALLPAPER;
      apply(selected);
    };
    window.addEventListener("storage", handleStorageChange);

    const themeObserver = new MutationObserver(() => apply(selected));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      window.removeEventListener("aide:wallpaper-change", handleWallpaperChange);
      window.removeEventListener("storage", handleStorageChange);
      themeObserver.disconnect();
      document.body.style.backgroundImage = previous.image;
      document.body.style.backgroundColor = previous.color;
      document.body.style.backgroundSize = previous.size;
      document.body.style.backgroundPosition = previous.position;
      document.body.style.backgroundAttachment = previous.attachment;
      document.body.style.backgroundRepeat = previous.repeat;
    };
  }, []);

  return null;
}
