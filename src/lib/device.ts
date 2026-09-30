// Device detection used to recommend the right Aide build for the visitor.

export type DeviceType = "android" | "ios" | "windows" | "macos" | "linux" | "desktop" | "unknown";

export function getDeviceType(): DeviceType {
  if (typeof navigator === "undefined") return "unknown";
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() ?? "";

  if (userAgent.includes("android") || userAgent.includes("armv7") || userAgent.includes("arm64")) {
    return "android";
  }
  if (userAgent.includes("iphone") || userAgent.includes("ipad") || userAgent.includes("ipod")) {
    return "ios";
  }
  if (platform.includes("win")) return "windows";
  if (platform.includes("mac")) return "macos";
  if (platform.includes("linux")) return "linux";
  if (typeof window !== "undefined" && window.screen?.availWidth > 768) return "desktop";
  return "unknown";
}

export function isMobile(): boolean {
  const device = getDeviceType();
  return device === "android" || device === "ios";
}

export function isAndroid(): boolean {
  return getDeviceType() === "android";
}

export function isIOS(): boolean {
  return getDeviceType() === "ios";
}

export function isWindows(): boolean {
  return getDeviceType() === "windows";
}

export function isMacOS(): boolean {
  return getDeviceType() === "macos";
}

export function isLinux(): boolean {
  return getDeviceType() === "linux";
}

export function getDeviceLabel(): string {
  switch (getDeviceType()) {
    case "android":
      return "Android";
    case "ios":
      return "iPhone";
    case "windows":
      return "Windows";
    case "macos":
      return "macOS";
    case "linux":
      return "Linux";
    case "desktop":
      return "Desktop";
    default:
      return "your device";
  }
}

export interface ReleaseInfo {
  version: string | null;
  versionCode: number;
  tag: string | null;
  downloadUrl: string | null;
  apkName: string | null;
  sizeBytes: number | null;
  releaseDate: string | null;
  releaseUrl: string | null;
}

/** The app itself — always available in the browser. */
export const PWA_URL = "https://aide.omixsystems.store";

/**
 * Fetches the newest published release. The APK url is a real GitHub asset
 * (direct download), not a releases page. Returns null when nothing is
 * published or the request fails.
 */
export async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  try {
    const res = await fetch("/api/latest-release");
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.version || !data?.downloadUrl) return null;
    return data as ReleaseInfo;
  } catch {
    return null;
  }
}

/**
 * The build to offer for the visitor's device.
 *
 * Only the Android APK is published right now, so every other platform is
 * directed at the PWA rather than being promised a file that does not exist.
 */
export function getRecommendedBuild(
  release: ReleaseInfo | null
): { kind: "apk" | "pwa" | "coming-soon"; platform: DeviceType; label: string; href: string } {
  const device = getDeviceType();

  if (device === "android" && release?.downloadUrl) {
    return {
      kind: "apk",
      platform: device,
      label: `Aide for Android (v${release.version})`,
      href: release.downloadUrl,
    };
  }

  if (device === "ios") {
    return {
      kind: "pwa",
      platform: device,
      label: "Add Aide to your iPhone",
      href: PWA_URL,
    };
  }

  if (device === "windows" || device === "macos" || device === "linux" || device === "desktop") {
    return {
      kind: "coming-soon",
      platform: device,
      label: "Desktop app",
      href: "/downloads",
    };
  }

  return { kind: "pwa", platform: device, label: "Open Aide in your browser", href: PWA_URL };
}
