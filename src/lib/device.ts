// Device detection utility to recommend appropriate download links

export type DeviceType = 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'desktop' | 'unknown';

export function getDeviceType(): DeviceType {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();

  // Android detection
  if (userAgent.includes('android') || userAgent.includes('armv7') || userAgent.includes('arm64')) {
    return 'android';
  }

  // iOS detection (iPhone, iPad, iPod)
  if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
    return 'ios';
  }

  // Windows detection
  if (platform.includes('win')) {
    return 'windows';
  }

  // macOS detection
  if (platform.includes('mac')) {
    return 'macos';
  }

  // Linux detection
  if (platform.includes('linux')) {
    return 'linux';
  }

  // Check for desktop via screen size (fallback)
  if (window.screen.availWidth > 768) {
    return 'desktop';
  }

  return 'unknown';
}

export function isMobile(): boolean {
  const device = getDeviceType();
  return device === 'android' || device === 'ios';
}

export function isAndroid(): boolean {
  return getDeviceType() === 'android';
}

export function isIOS(): boolean {
  return getDeviceType() === 'ios';
}

export function isWindows(): boolean {
  return getDeviceType() === 'windows';
}

export function isMacOS(): boolean {
  return getDeviceType() === 'macos';
}

export function isLinux(): boolean {
  return getDeviceType() === 'linux';
}

// Get download URL based on device
export function getDownloadUrl(): string {
  const device = getDeviceType();

  switch (device) {
    case 'android':
      return 'https://github.com/oliver4441/aide/releases/latest/download/app-release-unsigned.apk';
    case 'ios':
      return 'https://apps.apple.com/us/app/aide/id647890123'; // Placeholder - add App Store link
    case 'windows':
      return 'https://github.com/oliver4441/aide/releases/latest/download/Aide-Setup-1.0.0.exe';
    case 'macos':
      return 'https://github.com/oliver4441/aide/releases/latest/download/Aide-1.0.0-mac.dmg';
    case 'linux':
      return 'https://github.com/oliver4441/aide/releases/latest/download/Aide_1.0.0_amd64.deb';
    default:
      return 'https://aide-395ga290s-twistedoliver211fs-1271.vercel.app';
  }
}

// Get device label for display
export function getDeviceLabel(): string {
  const device = getDeviceType();

  switch (device) {
    case 'android':
      return 'Android';
    case 'ios':
      return 'iOS';
    case 'windows':
      return 'Windows';
    case 'macos':
      return 'macOS';
    case 'linux':
      return 'Linux';
    case 'desktop':
      return 'Desktop';
    default:
      return 'Device';
  }
}
