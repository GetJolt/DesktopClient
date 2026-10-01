// Packaging and auto-update configuration.
//
// Releases are published to a plain HTTPS folder (the marketing site's /download path by default), which serves
// both the download buttons and the update feed. Point JOLT_UPDATE_URL elsewhere to host them separately.

const updateUrl = process.env.JOLT_UPDATE_URL || 'https://joltapp.org/download';

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'chat.jolt.desktop',
  productName: 'Jolt',
  copyright: 'Copyright © 2026 The Jolt contributors',
  directories: {
    buildResources: 'build',
    output: 'release',
  },
  files: ['out/**', 'package.json'],
  // The website finds the current file names by reading latest.yml / latest-mac.yml / latest-linux.yml.
  artifactName: 'Jolt-${version}-${arch}.${ext}',
  protocols: [{ name: 'Jolt', schemes: ['jolt'] }],
  publish: [{ provider: 'generic', url: updateUrl, channel: 'latest' }],

  win: {
    target: [{ target: 'nsis', arch: ['x64', 'arm64'] }],
    icon: 'build/icon.ico',
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    artifactName: 'Jolt-Setup-${version}.${ext}',
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
    installerHeaderIcon: 'build/icon.ico',
    installerSidebar: 'build/installerSidebar.bmp',
    uninstallerSidebar: 'build/uninstallerSidebar.bmp',
    installerHeader: 'build/installerHeader.bmp',
    license: 'LICENSE',
    include: 'build/installer.nsh',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Jolt',
    runAfterFinish: true,
    deleteAppDataOnUninstall: false,
  },

  mac: {
    target: [
      { target: 'dmg', arch: ['universal'] },
      { target: 'zip', arch: ['universal'] },
    ],
    category: 'public.app-category.social-networking',
    icon: 'build/icon.png',
    hardenedRuntime: true,
  },
  dmg: {
    artifactName: 'Jolt-${version}.${ext}',
    background: 'build/background.png',
    iconSize: 96,
    window: { width: 540, height: 380 },
    contents: [
      { x: 150, y: 200, type: 'file' },
      { x: 390, y: 200, type: 'link', path: '/Applications' },
    ],
  },

  linux: {
    target: ['AppImage', 'deb'],
    category: 'Network;Chat;InstantMessaging',
    icon: 'build/icon.png',
    synopsis: 'Federated, self-hostable chat',
    executableName: 'jolt',
  },
  appImage: { artifactName: 'Jolt-${version}.${ext}' },
  deb: { artifactName: 'jolt_${version}_${arch}.${ext}' },
};
