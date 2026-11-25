/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.omixsystems.aide',
  productName: 'Aide',
  directories: {
    output: 'dist',
    buildResources: 'assets',
  },
  files: [
    'build/**/*',
    'next/**/*',
    'generated/**/*',
    'assets/**/*',
    'package.json',
    { from: 'vendor/node_modules', to: 'node_modules' },
  ],
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] }
    ],
    icon: 'assets/icon.ico',
  },
  nsis: {
    oneClick: false,
    perMachine: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Aide',
    uninstallDisplayName: 'Aide',
    displayLanguageSelector: false,
    warningsAsErrors: false
  },
  mac: {
    target: [
      'dmg',
      'zip'
    ],
    category: 'public.app-category.business',
    icon: 'assets/icon.icns',
    sign: false,
    hardenedRuntime: false,
  },
  linux: {
    target: [
      'deb',
      'AppImage',
      'zip'
    ],
    category: 'Office',
    icon: 'assets/icon.png',
    description: 'Aide is an offline-first business management platform with POS, inventory, and analytics.',
    maintainer: 'Omix Digital Solutions <omixsystems@gmail.com>',
    vendor: 'Omix Digital Solutions'
  },
  deb: {
    depends: [
      'libnotify4',
      'libxtst6',
      'libnss3',
      'libxshmfence1',
      'libasound2'
    ],
    packageCategory: 'office'
  },
  publish: {
    provider: 'github',
    owner: 'oliver4441',
    repo: 'aide'
  }
};