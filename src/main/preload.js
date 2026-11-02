const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zapretAPI', {
  // Engine Control
  getStatus: () => ipcRenderer.invoke('zapret:status'),
  start: (presetName) => ipcRenderer.invoke('zapret:start', presetName),
  stop: () => ipcRenderer.invoke('zapret:stop'),
  restart: (presetName) => ipcRenderer.invoke('zapret:restart', presetName),
  getPresets: () => ipcRenderer.invoke('zapret:presets'),
  setGameFilter: (enabled) => ipcRenderer.invoke('zapret:setGameFilter', enabled),
  getLogs: () => ipcRenderer.invoke('zapret:logs'),
  clearLogs: () => ipcRenderer.invoke('zapret:clearLogs'),

  // Smart Analyzer
  runSmartAnalysis: (candidatePresets) => ipcRenderer.invoke('analyzer:run', candidatePresets),
  abortSmartAnalysis: () => ipcRenderer.invoke('analyzer:abort'),

  // OTA Updates
  checkUpdates: () => ipcRenderer.invoke('ota:check'),
  performOTAUpdate: (latestSha) => ipcRenderer.invoke('ota:update', latestSha),

  // Lists Management
  getLists: () => ipcRenderer.invoke('lists:get'),
  saveList: (filename, content) => ipcRenderer.invoke('lists:save', { filename, content }),
  addDomainToList: (domain) => ipcRenderer.invoke('lists:addDomain', domain),
  updateCommunityBlocklist: () => ipcRenderer.invoke('lists:updateCommunity'),

  // Network Doctor
  diagnoseNetwork: () => ipcRenderer.invoke('doctor:diagnose'),
  flushDNS: () => ipcRenderer.invoke('doctor:flushDNS'),
  repairNetwork: () => ipcRenderer.invoke('doctor:repair'),

  // Safe DNS Manager
  getDnsProviders: () => ipcRenderer.invoke('dns:providers'),
  getCurrentDNS: () => ipcRenderer.invoke('dns:get'),
  setDNS: (providerKey) => ipcRenderer.invoke('dns:set', providerKey),
  testDnsProviders: () => ipcRenderer.invoke('dns:test'),

  // YouTube Speedtest & Discord Voice
  testYouTubeSpeed: () => ipcRenderer.invoke('speedtest:youtube'),
  testDiscordVoice: () => ipcRenderer.invoke('voice:test'),

  // Watchdog Auto-Heal
  getWatchdogStatus: () => ipcRenderer.invoke('watchdog:status'),
  toggleWatchdog: (enabled) => ipcRenderer.invoke('watchdog:toggle', enabled),

  // Mini-Mode Floating Widget
  toggleMiniMode: () => ipcRenderer.invoke('window:toggleMiniMode'),
  isMiniMode: () => ipcRenderer.invoke('window:isMiniMode'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Elevation / Admin
  relaunchElevated: () => ipcRenderer.invoke('app:relaunchElevated'),

  // Window Controls
  windowControl: (action) => ipcRenderer.send('window:control', action),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Open external URL
  openExternal: (url) => ipcRenderer.send('open:external', url),

  // Event Listeners
  onLog: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('zapret:log', handler);
    return () => ipcRenderer.removeListener('zapret:log', handler);
  },
  onStatusChange: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('zapret:statusChange', handler);
    return () => ipcRenderer.removeListener('zapret:statusChange', handler);
  },
  onAnalysisProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('analyzer:progress', handler);
    return () => ipcRenderer.removeListener('analyzer:progress', handler);
  },
  onOtaProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('ota:progress', handler);
    return () => ipcRenderer.removeListener('ota:progress', handler);
  },
  onMaximizedChange: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('window:maximizedChange', handler);
    return () => ipcRenderer.removeListener('window:maximizedChange', handler);
  },
  onWatchdogHealed: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('watchdog:healed', handler);
    return () => ipcRenderer.removeListener('watchdog:healed', handler);
  },
  onMiniModeChanged: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('window:miniModeChanged', handler);
    return () => ipcRenderer.removeListener('window:miniModeChanged', handler);
  }
});
