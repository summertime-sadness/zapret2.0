const { app, BrowserWindow, Tray, Menu, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const ZapretManager = require('./zapret-manager');
const SmartAnalyzer = require('./smart-analyzer');
const OtaUpdater = require('./ota-updater');
const NetworkDoctor = require('./network-doctor');
const DnsHelper = require('./dns-helper');
const Watchdog = require('./watchdog');
const SpeedTester = require('./speed-tester');
const VoiceTester = require('./voice-tester');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let isMiniMode = false;
let normalBounds = { width: 1060, height: 720, x: undefined, y: undefined };

// Settings path
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
let settings = {
  theme: 'dark', // 'dark' | 'light'
  minimizeToTray: true,
  startOnBoot: false,
  autoCheckUpdates: true,
  defaultPreset: 'general (ALT11).bat',
  gameFilter: false,
  watchdogEnabled: true,
  soundEffects: true,
  customTargets: []
};

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      settings = { ...settings, ...data };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

function saveSettings(newSettings) {
  try {
    settings = { ...settings, ...newSettings };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

    // Windows login item
    if (typeof settings.startOnBoot === 'boolean') {
      app.setLoginItemSettings({
        openAtLogin: settings.startOnBoot,
        args: ['--hidden']
      });
    }

    if (zapretManager) {
      zapretManager.setGameFilter(settings.gameFilter);
    }

    if (watchdog && typeof settings.watchdogEnabled === 'boolean') {
      watchdog.setEnabled(settings.watchdogEnabled);
    }

    if (smartAnalyzer && Array.isArray(settings.customTargets)) {
      smartAnalyzer.setCustomTargets(settings.customTargets);
    }
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

loadSettings();

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// Initialize Managers
const zapretManager = new ZapretManager();
const smartAnalyzer = new SmartAnalyzer(zapretManager);
const otaUpdater = new OtaUpdater({ zapretDir: zapretManager.rootDir });
const networkDoctor = new NetworkDoctor(zapretManager);
const dnsHelper = new DnsHelper(zapretManager);
const speedTester = new SpeedTester(zapretManager);
const voiceTester = new VoiceTester(zapretManager);
const watchdog = new Watchdog(zapretManager, smartAnalyzer, { enabled: settings.watchdogEnabled ?? true });

if (Array.isArray(settings.customTargets)) {
  smartAnalyzer.setCustomTargets(settings.customTargets);
}

// Asset paths with packaged fallback
function findAsset(filename) {
  const p1 = path.join(__dirname, '../../assets', filename);
  const p2 = path.join(__dirname, '../assets', filename);
  const p3 = path.join(path.dirname(process.execPath), 'assets', filename);
  const p4 = path.join(process.resourcesPath || '', 'assets', filename);
  if (fs.existsSync(p1)) return p1;
  if (fs.existsSync(p2)) return p2;
  if (fs.existsSync(p3)) return p3;
  if (fs.existsSync(p4)) return p4;
  return p1;
}

const iconPath = findAsset('icon.png');
const trayActivePath = findAsset('tray-active.png');
const trayIdlePath = findAsset('tray-idle.png');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1060,
    height: 720,
    minWidth: 880,
    minHeight: 580,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    icon: iconPath,
    show: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    // Check if launched with --hidden flag
    const isHiddenLaunch = process.argv.includes('--hidden');
    if (!isHiddenLaunch) {
      mainWindow.show();
    }
  });

  // Track maximize state
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximizedChange', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximizedChange', false);
  });

  // Close to tray behavior
  mainWindow.on('close', (event) => {
    if (!isQuitting && settings.minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();

      if (Notification.isSupported()) {
        new Notification({
          title: 'ZAPRET 2.0',
          body: 'Приложение свернуто в системный трей и продолжает работать',
          icon: iconPath
        }).show();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function relaunchElevated() {
  const { exec } = require('child_process');
  const electronExe = path.resolve(process.execPath);
  const workDir = path.dirname(electronExe);

  let cmd = '';
  if (app.isPackaged) {
    cmd = `Start-Process -FilePath '${electronExe}' -WorkingDirectory '${workDir}' -WindowStyle Hidden -Verb RunAs`;
  } else {
    const appPath = path.resolve(app.getAppPath());
    cmd = `Start-Process -FilePath '${electronExe}' -ArgumentList '${appPath}' -WorkingDirectory '${workDir}' -WindowStyle Hidden -Verb RunAs`;
  }

  exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`, { windowsHide: true }, (err) => {
    if (!err) {
      setTimeout(() => {
        isQuitting = true;
        app.exit(0);
      }, 500);
    }
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const status = zapretManager.getStatus();
  const isRunning = status.running;
  const currentPreset = status.preset || 'Не выбран';

  tray.setImage(isRunning ? trayActivePath : trayIdlePath);
  tray.setToolTip(`ZAPRET 2.0 - ${isRunning ? 'Работает (' + currentPreset + ')' : 'Остановлен'}`);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `ZAPRET 2.0: ${isRunning ? '● Активен' : '○ Остановлен'}`,
      enabled: false
    },
    {
      label: `Конфиг: ${currentPreset}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: isRunning ? '⏹ Остановить движок' : '▶ Запустить движок',
      click: async () => {
        try {
          if (isRunning) {
            await zapretManager.stop();
          } else {
            await zapretManager.start(settings.defaultPreset || 'general (ALT11).bat');
          }
        } catch (e) {
          console.error(e);
        }
      }
    },
    {
      label: '🔄 Перезапустить',
      enabled: isRunning,
      click: async () => {
        try {
          await zapretManager.restart();
        } catch (e) {
          console.error(e);
        }
      }
    },
    {
      label: '⚡ Запустить авто-оптимизацию',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('analyzer:trigger');
        }
      }
    },
    { type: 'separator' },
    {
      label: '🪟 Показать окно',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '❌ Выход',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function createTray() {
  tray = new Tray(trayIdlePath);
  tray.setToolTip('ZAPRET 2.0');

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });

  updateTrayMenu();
}

// Forward events to renderer
zapretManager.on('log', (logEntry) => {
  mainWindow?.webContents.send('zapret:log', logEntry);
});

zapretManager.on('status', (status) => {
  updateTrayMenu();
  mainWindow?.webContents.send('zapret:statusChange', status);
});

smartAnalyzer.on('progress', (data) => {
  mainWindow?.webContents.send('analyzer:progress', data);
});

otaUpdater.on('progress', (data) => {
  mainWindow?.webContents.send('ota:progress', data);
});

watchdog.on('healed', (info) => {
  mainWindow?.webContents.send('watchdog:healed', info);
  if (info.newPreset) {
    settings.defaultPreset = info.newPreset;
    saveSettings({ defaultPreset: info.newPreset });
    updateTrayMenu();
  }
  if (Notification.isSupported()) {
    new Notification({
      title: 'ZAPRET 2.0 • Auto-Heal',
      body: `Соединение восстановлено! Активирован: ${info.newPreset}`,
      icon: iconPath
    }).show();
  }
});

function toggleMiniMode() {
  if (!mainWindow) return isMiniMode;
  if (!isMiniMode) {
    normalBounds = mainWindow.getBounds();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setResizable(false);
    mainWindow.setMinimumSize(320, 80);
    mainWindow.setSize(330, 80);
    isMiniMode = true;
  } else {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setResizable(true);
    mainWindow.setMinimumSize(880, 580);
    mainWindow.setBounds(normalBounds);
    isMiniMode = false;
  }
  mainWindow.webContents.send('window:miniModeChanged', isMiniMode);
  return isMiniMode;
}

// IPC Handler Registrations
function setupIPC() {
  // Zapret Engine
  ipcMain.handle('zapret:status', () => zapretManager.getStatus());
  ipcMain.handle('zapret:presets', () => zapretManager.getPresets());
  ipcMain.handle('zapret:start', async (event, presetName) => {
    if (presetName) settings.defaultPreset = presetName;
    return await zapretManager.start(presetName);
  });
  ipcMain.handle('zapret:stop', async () => await zapretManager.stop());
  ipcMain.handle('zapret:restart', async (event, presetName) => await zapretManager.restart(presetName));
  ipcMain.handle('zapret:setGameFilter', (event, enabled) => {
    zapretManager.setGameFilter(enabled);
    saveSettings({ gameFilter: enabled });
    return zapretManager.getStatus();
  });
  ipcMain.handle('zapret:logs', () => zapretManager.getLogs());
  ipcMain.handle('zapret:clearLogs', () => zapretManager.clearLogs());

  // Smart Analyzer
  ipcMain.handle('analyzer:run', async (event, candidates) => {
    const summary = await smartAnalyzer.runAnalysis(candidates);
    if (summary && summary.winner) {
      settings.defaultPreset = summary.winner;
      saveSettings({ defaultPreset: summary.winner });
      updateTrayMenu();
    }
    return summary;
  });
  ipcMain.handle('analyzer:abort', () => smartAnalyzer.abort());

  // OTA Updates
  ipcMain.handle('ota:check', async () => await otaUpdater.checkForUpdates());
  ipcMain.handle('ota:update', async (event, sha) => await otaUpdater.performOTAUpdate(sha));

  // Lists
  ipcMain.handle('lists:get', () => zapretManager.getLists());
  ipcMain.handle('lists:save', (event, { filename, content }) => zapretManager.saveList(filename, content));

  // Settings
  ipcMain.handle('settings:get', () => settings);
  ipcMain.handle('settings:save', (event, newSettings) => {
    saveSettings(newSettings);
    return settings;
  });

  // Elevation / Admin Relaunch
  ipcMain.handle('app:relaunchElevated', () => {
    relaunchElevated();
    return true;
  });

  // Network Doctor
  ipcMain.handle('doctor:diagnose', async () => await networkDoctor.runDiagnostics());
  ipcMain.handle('doctor:flushDNS', () => networkDoctor.flushDNS());
  ipcMain.handle('doctor:repair', async () => await networkDoctor.repairAll());

  // Safe DNS Helper
  ipcMain.handle('dns:providers', () => dnsHelper.getProviders());
  ipcMain.handle('dns:get', () => dnsHelper.getCurrentDNS());
  ipcMain.handle('dns:set', async (event, providerKey) => await dnsHelper.setDNS(providerKey));
  ipcMain.handle('dns:test', async () => await dnsHelper.testAllProviders());

  // YouTube Speedtest & Discord Voice
  ipcMain.handle('speedtest:youtube', async () => await speedTester.testYouTubeSpeed());
  ipcMain.handle('voice:test', async () => await voiceTester.testDiscordVoice());

  // Lists additions
  ipcMain.handle('lists:addDomain', async (event, domain) => await zapretManager.addDomainToUserList(domain));
  ipcMain.handle('lists:updateCommunity', async () => await zapretManager.updateCommunityBlocklist());

  // Watchdog
  ipcMain.handle('watchdog:status', () => watchdog.getStatus());
  ipcMain.handle('watchdog:toggle', (event, enabled) => {
    watchdog.setEnabled(enabled);
    saveSettings({ watchdogEnabled: enabled });
    return watchdog.getStatus();
  });

  // Mini-mode
  ipcMain.handle('window:toggleMiniMode', () => toggleMiniMode());
  ipcMain.handle('window:isMiniMode', () => isMiniMode);

  // Window control
  ipcMain.on('window:control', (event, action) => {
    if (!mainWindow) return;
    switch (action) {
      case 'minimize':
        mainWindow.minimize();
        break;
      case 'maximize':
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        break;
      case 'close':
        mainWindow.close();
        break;
    }
  });

  ipcMain.handle('window:isMaximized', () => mainWindow ? mainWindow.isMaximized() : false);

  ipcMain.on('open:external', (event, url) => {
    shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  createTray();
  setupIPC();
  createWindow();

  // Apply initial game filter from settings
  zapretManager.setGameFilter(settings.gameFilter);

  // Start watchdog background monitor if enabled
  if (settings.watchdogEnabled) {
    watchdog.start();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', async (event) => {
  isQuitting = true;
  if (watchdog) watchdog.stop();
  // Cleanup winws process and WinDivert on app quit
  try {
    await zapretManager.stop();
  } catch (e) {
    // ignore
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !settings.minimizeToTray) {
    app.quit();
  }
});
