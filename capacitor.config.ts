import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.omixsystems.aide',
  appName: 'aide',
  webDir: 'public',
  server: {
    url: 'https://aide.omixsystems.store'
  }
};

export default config;
