interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    url: string;
  };
}

const config: CapacitorConfig = {
  appId: 'com.omixsystems.aide',
  appName: 'aide',
  webDir: 'public',
  server: {
    url: 'https://aide.omixsystems.store'
  }
};

export default config;
