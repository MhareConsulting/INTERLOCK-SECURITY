import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'co.za.interlock.security',
  appName: 'Interlock Security',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
