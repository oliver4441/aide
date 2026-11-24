import { defineConfig } from '@capawesome/capacitor-electron/config';
import type { BrowserWindow } from 'electron';

export default defineConfig({
  window: {
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#14130f',
    showOnLaunch: false,
  },
  splashScreen: {
    path: 'assets/splash.html',
    width: 400,
    height: 300,
    backgroundColor: '#14130f',
    minimumDurationMs: 0,
  },
  deepLinks: {
    scheme: 'aide',
  },
  hooks: {
    onWindowCreated(win: BrowserWindow) {
      win.setMenuBarVisibility(false);
      win.once('ready-to-show', () => {
        win.show();
      });
    },
  },
  plugins: {
    LiveUpdate: {
      defaultChannel: `production-${require('./package.json').version}`,
    },
  },
});