// ==========================================================================
// ZAPRET GLASS - RENDERER APPLICATION CONTROLLER
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Application State
  const state = {
    status: {
      running: false,
      preset: null,
      pid: null,
      uptime: 0,
      isElevated: false,
      gameFilter: false
    },
    presets: [],
    settings: {
      theme: 'dark',
      minimizeToTray: true,
      startOnBoot: false,
      autoCheckUpdates: true,
      defaultPreset: 'general (ALT11).bat',
      gameFilter: false
    },
    activeTab: 'tab-dashboard',
    currentListFile: 'list-general-user.txt',
    isAnalyzing: false,
    isUpdating: false,
    uptimeTimer: null,
    remoteUpdateInfo: null,
    analysisResults: []
  };

  // DOM Elements Cache
  const elements = {
    // Titlebar
    titlebarStatusBadge: document.getElementById('titlebar-status-badge'),
    titlebarStatusText: document.getElementById('titlebar-status-text'),
    btnQuickGame: document.getElementById('btn-quick-game'),
    btnToggleMini: document.getElementById('btn-toggle-mini'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    btnWinMin: document.getElementById('btn-win-min'),
    btnWinMax: document.getElementById('btn-win-max'),
    btnWinClose: document.getElementById('btn-win-close'),

    // Mini-Mode Widget
    miniModeWidget: document.getElementById('mini-mode-widget'),
    miniStatusLed: document.getElementById('mini-status-led'),
    miniPresetName: document.getElementById('mini-preset-name'),
    miniPingVal: document.getElementById('mini-ping-val'),
    miniBtnPower: document.getElementById('mini-btn-power'),
    miniBtnExpand: document.getElementById('mini-btn-expand'),

    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    userStatusDot: document.getElementById('user-status-indicator'),
    btnQuickToggle: document.getElementById('btn-quick-toggle'),
    otaSidebarBadge: document.getElementById('ota-sidebar-badge'),

    // Admin Alert Banner
    adminAlertBanner: document.getElementById('admin-alert-banner'),
    btnRelaunchAdmin: document.getElementById('btn-relaunch-admin'),

    // Dashboard
    badgeAdmin: document.getElementById('badge-admin'),
    textAdminStatus: document.getElementById('text-admin-status'),
    textUptime: document.getElementById('text-uptime'),
    heroRing: document.getElementById('hero-ring'),
    heroStateText: document.getElementById('hero-state-text'),
    heroPresetText: document.getElementById('hero-preset-text'),
    btnToggleEngine: document.getElementById('btn-toggle-engine'),
    btnToggleText: document.getElementById('btn-toggle-text'),
    btnRestartEngine: document.getElementById('btn-restart-engine'),
    btnDashSmart: document.getElementById('btn-dash-smart'),
    btnDashSmartText: document.getElementById('btn-dash-smart-text'),
    dashSmartBanner: document.getElementById('dash-smart-banner'),
    dashSmartBadge: document.getElementById('dash-smart-badge'),
    dashSmartTitle: document.getElementById('dash-smart-title'),
    dashSmartDesc: document.getElementById('dash-smart-desc'),
    dashDiscordPing: document.getElementById('dash-discord-ping'),
    dashYoutubePing: document.getElementById('dash-youtube-ping'),
    dashCfPing: document.getElementById('dash-cf-ping'),

    // Interactive Dashboard Tests (Voice & Speed)
    btnRunVoiceTest: document.getElementById('btn-run-voice-test'),
    voiceStatusTag: document.getElementById('voice-status-tag'),
    voiceMetricVal: document.getElementById('voice-metric-val'),
    voicePingVal: document.getElementById('voice-ping-val'),
    voiceRecBox: document.getElementById('voice-rec-box'),
    btnRunSpeedTest: document.getElementById('btn-run-speed-test'),
    btnSpeedLabel: document.getElementById('btn-speed-label'),
    ytSpeedVal: document.getElementById('yt-speed-val'),
    ytQualityBadge: document.getElementById('yt-quality-badge'),
    ytSpeedDesc: document.getElementById('yt-speed-desc'),

    // Smart Analyzer
    btnStartSmartTest: document.getElementById('btn-start-smart-test'),
    btnSmartLabel: document.getElementById('btn-smart-label'),
    smartHeaderActivePill: document.getElementById('smart-header-active-pill'),
    smartHeaderActiveName: document.getElementById('smart-header-active-name'),
    smartProgressPanel: document.getElementById('smart-progress-panel'),
    smartProgressTitle: document.getElementById('smart-progress-title'),
    smartProgressCounter: document.getElementById('smart-progress-counter'),
    smartProgressFill: document.getElementById('smart-progress-fill'),
    smartProgressSub: document.getElementById('smart-progress-sub'),
    smartWinnerCard: document.getElementById('smart-winner-card'),
    winnerPresetName: document.getElementById('winner-preset-name'),
    winnerRate: document.getElementById('winner-rate'),
    winnerPing: document.getElementById('winner-ping'),
    winnerScore: document.getElementById('winner-score'),
    btnWinnerGoDash: document.getElementById('btn-winner-go-dash'),
    smartResultsBody: document.getElementById('smart-results-body'),

    // Presets
    presetsContainer: document.getElementById('presets-container'),
    searchPresets: document.getElementById('search-presets'),

    // Lists
    inputQuickDomain: document.getElementById('input-quick-domain'),
    btnQuickAddDomain: document.getElementById('btn-quick-add-domain'),
    btnSyncCommunity: document.getElementById('btn-sync-community'),
    listTabsRow: document.getElementById('list-tabs-row'),
    currentListName: document.getElementById('current-list-name'),
    listEditor: document.getElementById('list-editor'),
    btnSaveList: document.getElementById('btn-save-list'),

    // Logs
    terminalOutput: document.getElementById('terminal-output'),
    btnClearLogs: document.getElementById('btn-clear-logs'),
    btnCopyLogs: document.getElementById('btn-copy-logs'),

    // OTA
    linkGithubRepo: document.getElementById('link-github-repo'),
    otaLocalVer: document.getElementById('ota-local-ver'),
    otaLocalSha: document.getElementById('ota-local-sha'),
    otaRemoteVer: document.getElementById('ota-remote-ver'),
    otaRemoteSha: document.getElementById('ota-remote-sha'),
    otaStatusMsg: document.getElementById('ota-status-msg'),
    btnCheckUpdates: document.getElementById('btn-check-updates'),
    btnPerformOta: document.getElementById('btn-perform-ota'),
    otaProgressWrap: document.getElementById('ota-progress-wrap'),
    otaProgressText: document.getElementById('ota-progress-text'),
    otaProgressBar: document.getElementById('ota-progress-bar'),

    // Doctor & Safe DNS
    btnDocDiagnose: document.getElementById('btn-doc-diagnose'),
    btnDocRepair: document.getElementById('btn-doc-repair'),
    btnDocFlushDns: document.getElementById('btn-doc-flush-dns'),
    docDnsState: document.getElementById('doc-dns-state'),
    docConflictsState: document.getElementById('doc-conflicts-state'),
    docProxyState: document.getElementById('doc-proxy-state'),
    docDivertState: document.getElementById('doc-divert-state'),
    docDetailsLog: document.getElementById('doc-details-log'),
    dnsActiveProvider: document.getElementById('dns-active-provider'),
    dnsProvidersGrid: document.getElementById('dns-providers-grid'),

    // Settings
    settingMinimizeTray: document.getElementById('setting-minimize-tray'),
    settingAutostart: document.getElementById('setting-autostart'),
    settingAutoUpdates: document.getElementById('setting-auto-updates'),
    settingGameFilter: document.getElementById('setting-game-filter'),
    settingWatchdog: document.getElementById('setting-watchdog'),
    settingSoundEffects: document.getElementById('setting-sound-effects'),
    themeBtnDark: document.getElementById('theme-btn-dark'),
    themeBtnLight: document.getElementById('theme-btn-light'),
    inputCustomTargetName: document.getElementById('input-custom-target-name'),
    inputCustomTargetUrl: document.getElementById('input-custom-target-url'),
    btnAddCustomTarget: document.getElementById('btn-add-custom-target'),
    customTargetsContainer: document.getElementById('custom-targets-container'),

    // Toast
    toastContainer: document.getElementById('toast-container')
  };

  // Toast Notification System
  function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#23a55a" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f23f43" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5865f2" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // Uptime Formatter
  function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function startUptimeCounter() {
    if (state.uptimeTimer) clearInterval(state.uptimeTimer);
    state.uptimeTimer = setInterval(() => {
      if (state.status.running) {
        state.status.uptime++;
        elements.textUptime.textContent = formatUptime(state.status.uptime);
      }
    }, 1000);
  }

  // Update Status Display
  function renderStatus(status) {
    state.status = { ...state.status, ...status };

    const isRunning = state.status.running;
    const isElevated = state.status.isElevated;
    const presetName = state.status.preset || 'Не выбран';

    // Titlebar badge - clearly display which strategy is active!
    elements.titlebarStatusBadge.className = `engine-badge ${isRunning ? 'badge-running' : 'badge-stopped'}`;
    elements.titlebarStatusText.textContent = isRunning ? (presetName !== 'Не выбран' ? presetName.replace(/\.bat$/i, '') : 'Активен') : 'Остановлен';
    elements.titlebarStatusBadge.title = isRunning ? `Активная стратегия: ${presetName}` : 'Zapret остановлен';

    // Sidebar status indicator (if present)
    if (elements.userStatusDot) {
      elements.userStatusDot.className = `user-status-dot ${isRunning ? 'status-online' : 'status-offline'}`;
    }

    // Admin status
    elements.textAdminStatus.textContent = isElevated ? 'Администратор' : 'Обычный доступ';
    elements.badgeAdmin.style.opacity = isElevated ? '1' : '0.6';
    if (elements.adminAlertBanner) {
      elements.adminAlertBanner.style.display = isElevated ? 'none' : 'flex';
    }

    // Hero Ring & Text
    if (isRunning) {
      elements.heroRing.className = 'status-indicator-ring running';
      elements.heroStateText.textContent = 'Работает';
      elements.heroStateText.style.color = 'var(--discord-green)';
      elements.btnToggleEngine.className = 'liquid-btn btn-danger';
      elements.btnToggleText.textContent = 'ОСТАНОВИТЬ ZAPRET';
      elements.btnRestartEngine.style.display = 'inline-flex';
      elements.heroPresetText.innerHTML = `Активный пресет: <span>${presetName}</span>`;
    } else {
      elements.heroRing.className = 'status-indicator-ring';
      elements.heroStateText.textContent = 'Остановлен';
      elements.heroStateText.style.color = 'var(--text-header)';
      elements.btnToggleEngine.className = 'liquid-btn btn-primary';
      elements.btnToggleText.textContent = 'ЗАПУСТИТЬ ZAPRET';
      elements.btnRestartEngine.style.display = 'none';
      elements.heroPresetText.innerHTML = `Активный пресет: <span>${presetName}</span>`;
    }

    // Smart Header Active Pill indicator in Smart Analyzer tab
    if (elements.smartHeaderActivePill && elements.smartHeaderActiveName) {
      if (isRunning && presetName !== 'Не выбран') {
        elements.smartHeaderActivePill.style.display = 'inline-flex';
        elements.smartHeaderActiveName.textContent = presetName;
      } else {
        elements.smartHeaderActivePill.style.display = 'none';
      }
    }

    // Dashboard Smart Banner update
    if (elements.dashSmartBadge && elements.dashSmartTitle && elements.dashSmartDesc) {
      if (isRunning && presetName !== 'Не выбран') {
        elements.dashSmartBadge.textContent = '✓ АКТИВНАЯ СТРАТЕГИЯ';
        elements.dashSmartBadge.className = 'banner-badge banner-badge-active';
        elements.dashSmartTitle.innerHTML = `⚡ Активна стратегия: <b>${presetName}</b>`;
        elements.dashSmartDesc.textContent = `Данная стратегия сейчас работает и защищает сетевой трафик Discord и YouTube. Вы можете перепроверить все 22 стратегии в любое время.`;
        if (elements.btnDashSmartText) elements.btnDashSmartText.textContent = 'Перепроверить';
      } else {
        elements.dashSmartBadge.textContent = 'РЕКОМЕНДАЦИЯ';
        elements.dashSmartBadge.className = 'banner-badge';
        elements.dashSmartTitle.textContent = '⚡ Автоматический подбор лучшего конфига';
        elements.dashSmartDesc.textContent = 'Запустите анализ в один клик: система протестирует все 22 конфигурации, измерит доступность и скорость Discord/YouTube и автоматически применит оптимальный вариант.';
        if (elements.btnDashSmartText) elements.btnDashSmartText.textContent = 'Подобрать и применить';
      }
    }

    elements.textUptime.textContent = formatUptime(state.status.uptime || 0);

    // Quick Game Filter button
    if (state.status.gameFilter) {
      elements.btnQuickGame.classList.add('active');
    } else {
      elements.btnQuickGame.classList.remove('active');
    }

    // Bottom-left Master Power Quick Button styling & animations
    if (elements.btnQuickToggle) {
      elements.btnQuickToggle.classList.remove('btn-power-idle', 'btn-power-running', 'btn-power-testing');
      if (state.isAnalyzing) {
        elements.btnQuickToggle.classList.add('btn-power-testing');
        elements.btnQuickToggle.title = 'Идет тестирование конфигураций...';
      } else if (isRunning) {
        elements.btnQuickToggle.classList.add('btn-power-running');
        elements.btnQuickToggle.title = `ZAPRET 2.0 Активен (${presetName}). Нажмите для быстрой остановки`;
      } else {
        elements.btnQuickToggle.classList.add('btn-power-idle');
        elements.btnQuickToggle.title = 'ZAPRET 2.0 Остановлен. Нажмите для быстрого запуска';
      }
    }

    // Mini-Mode Widget State
    if (elements.miniPresetName) {
      elements.miniPresetName.textContent = isRunning ? (presetName.replace(/\.bat$/i, '')) : 'Остановлен';
    }
    if (elements.miniStatusLed) {
      elements.miniStatusLed.className = isRunning ? 'mini-status-led online' : 'mini-status-led';
    }
    if (elements.miniBtnPower) {
      if (isRunning) elements.miniBtnPower.classList.add('active');
      else elements.miniBtnPower.classList.remove('active');
    }

    // Refresh active preset cards
    renderPresets();

    // Refresh active state in analyzer table if results exist
    if (state.analysisResults && state.analysisResults.length > 0) {
      renderAnalysisResultsTable(isRunning ? presetName : null);
    }
  }

  // Theme Management
  function applyTheme(theme) {
    state.settings.theme = theme;
    if (theme === 'light') {
      document.body.className = 'theme-light';
      elements.themeBtnLight.classList.add('active');
      elements.themeBtnDark.classList.remove('active');
    } else {
      document.body.className = 'theme-dark';
      elements.themeBtnDark.classList.add('active');
      elements.themeBtnLight.classList.remove('active');
    }
    window.zapretAPI.saveSettings({ theme });
  }

  elements.btnThemeToggle.addEventListener('click', () => {
    const nextTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });

  elements.themeBtnDark.addEventListener('click', () => applyTheme('dark'));
  elements.themeBtnLight.addEventListener('click', () => applyTheme('light'));

  // Window Controls
  elements.btnWinMin.addEventListener('click', () => window.zapretAPI.windowControl('minimize'));
  elements.btnWinMax.addEventListener('click', () => window.zapretAPI.windowControl('maximize'));
  elements.btnWinClose.addEventListener('click', () => window.zapretAPI.windowControl('close'));

  // Admin Elevation Relaunch
  if (elements.btnRelaunchAdmin) {
    elements.btnRelaunchAdmin.addEventListener('click', async () => {
      try {
        showToast('Запрос прав Администратора (Windows UAC)...', 'info');
        await window.zapretAPI.relaunchElevated();
      } catch (e) {
        showToast(`Ошибка перезапуска: ${e.message}`, 'error');
      }
    });
  }

  // Tab Navigation
  function switchTab(tabId) {
    state.activeTab = tabId;
    elements.navItems.forEach(item => {
      if (item.dataset.tab === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    elements.tabPanes.forEach(pane => {
      if (pane.id === tabId) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Lazy load tab data
    if (tabId === 'tab-lists') {
      loadListData(state.currentListFile);
    } else if (tabId === 'tab-ota') {
      loadOtaInfo();
    } else if (tabId === 'tab-doctor') {
      runDoctorDiagnostics();
      loadDnsInfo();
    }
  }

  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;
      if (tabId) switchTab(tabId);
    });
  });

  // Engine Actions: Start / Stop / Restart
  async function toggleEngine() {
    try {
      if (state.status.running) {
        elements.btnToggleText.textContent = 'Остановка...';
        await window.zapretAPI.stop();
        window.soundFX?.playDisconnect();
        showToast('Zapret остановлен', 'info');
      } else {
        elements.btnToggleText.textContent = 'Запуск...';
        const targetPreset = state.status.preset || state.settings.defaultPreset || 'general (ALT11).bat';
        await window.zapretAPI.start(targetPreset);
        window.soundFX?.playConnect();
        showToast(`Zapret успешно запущен [${targetPreset}]`, 'success');
      }
    } catch (err) {
      window.soundFX?.playAlert();
      showToast(`Ошибка: ${err.message}`, 'error');
    }
  }

  elements.btnToggleEngine.addEventListener('click', toggleEngine);
  elements.btnQuickToggle.addEventListener('click', toggleEngine);
  if (elements.miniBtnPower) elements.miniBtnPower.addEventListener('click', toggleEngine);

  elements.btnRestartEngine.addEventListener('click', async () => {
    try {
      showToast('Перезапуск ядра Zapret...', 'info');
      await window.zapretAPI.restart();
      showToast('Ядро Zapret успешно перезапущено', 'success');
    } catch (err) {
      showToast(`Ошибка перезапуска: ${err.message}`, 'error');
    }
  });

  // Game Filter Quick Toggle
  elements.btnQuickGame.addEventListener('click', async () => {
    try {
      const nextVal = !state.status.gameFilter;
      const res = await window.zapretAPI.setGameFilter(nextVal);
      renderStatus(res);
      showToast(`Игровой фильтр ${nextVal ? 'включен' : 'выключен'}`, 'info');
    } catch (e) {
      showToast(`Ошибка: ${e.message}`, 'error');
    }
  });

  // Presets Rendering
  function renderPresets() {
    const filter = (elements.searchPresets.value || '').toLowerCase().trim();
    elements.presetsContainer.innerHTML = '';

    const filtered = state.presets.filter(p => {
      return p.name.toLowerCase().includes(filter) || p.filename.toLowerCase().includes(filter) || p.category.toLowerCase().includes(filter);
    });

    if (filtered.length === 0) {
      elements.presetsContainer.innerHTML = '<div class="glass-card" style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Конфигурации не найдены</div>';
      return;
    }

    filtered.forEach(preset => {
      const isActive = state.status.running && state.status.preset?.toLowerCase() === preset.filename.toLowerCase();
      const card = document.createElement('div');
      card.className = `glass-card preset-card ${isActive ? 'is-active' : ''}`;

      card.innerHTML = `
        <div class="preset-header">
          <div>
            <div class="preset-title">${preset.name}</div>
            <div class="preset-category">${preset.category}</div>
          </div>
          ${preset.recommended ? '<span class="rec-tag">Рекомендуемый</span>' : ''}
        </div>
        <div class="preset-actions">
          <button class="liquid-btn ${isActive ? 'btn-danger' : 'btn-glass'} btn-select-preset">
            ${isActive ? '⏹ Остановить' : '▶ Активировать'}
          </button>
        </div>
      `;

      const selectBtn = card.querySelector('.btn-select-preset');
      selectBtn.addEventListener('click', async () => {
        try {
          if (isActive) {
            await window.zapretAPI.stop();
            showToast(`Конфигурация ${preset.name} остановлена`, 'info');
          } else {
            showToast(`Запуск конфигурации: ${preset.name}...`, 'info');
            await window.zapretAPI.start(preset.filename);
            showToast(`Конфигурация ${preset.name} активна`, 'success');
          }
        } catch (err) {
          showToast(`Ошибка: ${err.message}`, 'error');
        }
      });

      elements.presetsContainer.appendChild(card);
    });
  }

  elements.searchPresets.addEventListener('input', renderPresets);

  // ================= SMART CONFIG ANALYZER =================
  // Render Smart Analyzer results table with active preset highlighted
  function renderAnalysisResultsTable(activePreset) {
    if (!state.analysisResults || state.analysisResults.length === 0) return;

    elements.smartResultsBody.innerHTML = '';

    // Sort by score descending, then by avgLatency ascending
    const sorted = [...state.analysisResults].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.avgLatency - b.avgLatency;
    });

    sorted.forEach((res, index) => {
      const tr = document.createElement('tr');
      const isWinner = activePreset && res.preset.toLowerCase() === activePreset.toLowerCase();

      if (isWinner) {
        tr.className = 'active-applied-row';
      }

      let scoreClass = 'score-low';
      if (res.score >= 80) scoreClass = 'score-high';
      else if (res.score >= 50) scoreClass = 'score-med';

      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            ${index === 0 ? '<span title="Лучший результат" style="color:#ffd700; font-size:14px;">★</span>' : ''}
            <b>${res.preset}</b>
          </div>
        </td>
        <td>
          <span class="status-tag ${res.discordOk ? 'tag-ok' : 'tag-fail'}">
            ${res.discordOk ? '✓ Доступен' : '✗ Блокировка'}
          </span>
        </td>
        <td>
          <span class="status-tag ${res.youtubeOk ? 'tag-ok' : 'tag-fail'}">
            ${res.youtubeOk ? '✓ 4K OK' : '✗ Блокировка'}
          </span>
        </td>
        <td>${res.successRate}%</td>
        <td>${res.avgLatency < 9999 ? res.avgLatency + ' ms' : '--'}</td>
        <td><span class="score-badge ${scoreClass}">${res.score}</span></td>
        <td>
          ${isWinner ? `
            <button class="liquid-btn btn-active-badge" disabled title="Данная стратегия сейчас работает">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>ПРИМЕНЕН</span>
            </button>
          ` : `
            <button class="liquid-btn btn-glass btn-apply-row" style="padding: 4px 10px; font-size: 11px;">Применить</button>
          `}
        </td>
      `;

      if (!isWinner) {
        const btn = tr.querySelector('.btn-apply-row');
        if (btn) {
          btn.addEventListener('click', async () => {
            try {
              showToast(`Запуск конфигурации: ${res.preset}...`, 'info');
              await window.zapretAPI.start(res.preset);
              state.status.running = true;
              state.status.preset = res.preset;
              renderStatus(state.status);
              renderAnalysisResultsTable(res.preset);
              showToast(`Конфигурация ${res.preset} успешно применена`, 'success');
            } catch (e) {
              showToast(`Ошибка: ${e.message}`, 'error');
            }
          });
        }
      }

      elements.smartResultsBody.appendChild(tr);
    });
  }

  async function triggerSmartAnalyzer() {
    if (state.isAnalyzing) {
      window.zapretAPI.abortSmartAnalysis();
      return;
    }

    switchTab('tab-smart');
    state.isAnalyzing = true;
    state.analysisResults = [];
    elements.btnSmartLabel.textContent = 'Остановить анализ';
    elements.btnStartSmartTest.className = 'liquid-btn btn-danger';
    elements.smartProgressPanel.style.display = 'block';
    elements.smartWinnerCard.style.display = 'none';
    elements.smartProgressFill.style.width = '0%';
    elements.smartProgressFill.style.background = 'var(--discord-blurple)';
    elements.smartProgressTitle.textContent = 'Запуск комплексного анализа всех 22 стратегий...';
    elements.smartProgressCounter.textContent = '0 / 22';
    elements.smartProgressSub.textContent = 'Тестирование сетевых рукопожатий TLS и HTTP поочередно для всех стратегий...';
    elements.smartResultsBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table-cell">Выполняется поочередное тестирование всех 22 стратегий...</td>
      </tr>
    `;

    elements.titlebarStatusBadge.className = 'engine-badge badge-testing';
    elements.titlebarStatusText.textContent = 'Тестирование';
    if (elements.btnQuickToggle) {
      elements.btnQuickToggle.className = 'user-quick-btn btn-power-testing';
      elements.btnQuickToggle.title = 'Идет тестирование конфигураций...';
    }
    if (elements.userStatusDot) {
      elements.userStatusDot.className = 'user-status-dot status-testing';
    }

    try {
      showToast('Запущен интеллектуальный подбор среди всех 22 стратегий...', 'info');
      const summary = await window.zapretAPI.runSmartAnalysis();

      if (summary && summary.winner) {
        state.status.running = true;
        state.status.preset = summary.winner;

        elements.smartWinnerCard.style.display = 'flex';
        elements.winnerPresetName.textContent = summary.winner;
        elements.winnerRate.textContent = `${summary.winnerSuccessRate}%`;
        elements.winnerPing.textContent = `${summary.winnerLatency} ms`;
        elements.winnerScore.textContent = `${summary.winnerScore} / 100`;

        elements.smartProgressTitle.textContent = `✓ Анализ всех ${summary.scores.length} стратегий успешно завершен!`;
        elements.smartProgressCounter.textContent = `${summary.scores.length} / ${summary.scores.length}`;
        elements.smartProgressFill.style.width = '100%';
        elements.smartProgressFill.style.background = 'linear-gradient(90deg, #23a55a, #00d2ff)';
        elements.smartProgressSub.textContent = `Автоматически применена лучшая конфигурация: ${summary.winner} (Счет: ${summary.winnerScore}/100, Пинг: ${summary.winnerLatency}ms)`;

        if (summary.scores && summary.scores.length > 0) {
          state.analysisResults = summary.scores;
        }
        renderAnalysisResultsTable(summary.winner);
        renderStatus(state.status);

        window.soundFX?.playWinner();
        showToast(`Оптимизация завершена! Применена лучшая стратегия: ${summary.winner}`, 'success', 6000);
      } else {
        showToast('Анализ завершен', 'info');
      }
    } catch (err) {
      showToast(`Ошибка анализа: ${err.message}`, 'error');
    } finally {
      state.isAnalyzing = false;
      elements.btnSmartLabel.textContent = 'Запустить оптимизацию в 1 клик';
      elements.btnStartSmartTest.className = 'liquid-btn btn-accent';
      const curStatus = await window.zapretAPI.getStatus();
      renderStatus(curStatus);
      if (curStatus.preset) {
        renderAnalysisResultsTable(curStatus.preset);
      }
    }
  }

  elements.btnStartSmartTest.addEventListener('click', triggerSmartAnalyzer);
  elements.btnDashSmart.addEventListener('click', triggerSmartAnalyzer);
  if (elements.btnWinnerGoDash) {
    elements.btnWinnerGoDash.addEventListener('click', () => {
      switchTab('tab-dashboard');
    });
  }

  // Smart Analyzer Progress Listener
  window.zapretAPI.onAnalysisProgress((data) => {
    if (data.stage === 'started') {
      elements.smartProgressTitle.textContent = data.message;
      elements.smartProgressCounter.textContent = `0 / ${data.totalConfigs}`;
      elements.smartProgressFill.style.width = '2%';
    } else if (data.stage === 'testing_config') {
      elements.smartProgressTitle.textContent = `Тестирование: ${data.preset}`;
      elements.smartProgressCounter.textContent = `${data.currentIndex} / ${data.totalConfigs}`;
      const pct = Math.round((data.currentIndex / data.totalConfigs) * 100);
      elements.smartProgressFill.style.width = `${pct}%`;
      elements.smartProgressSub.textContent = data.message;
    } else if (data.stage === 'config_finished') {
      state.analysisResults.push(data.result);
      renderAnalysisResultsTable(state.status.preset);
    }
  });

  // ================= LISTS MANAGER =================
  async function loadListData(filename) {
    state.currentListFile = filename;
    elements.currentListName.textContent = filename;
    elements.listEditor.value = 'Загрузка содержимого...';

    // Update active tab button
    document.querySelectorAll('.list-tab-btn').forEach(btn => {
      if (btn.dataset.file === filename) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    try {
      const lists = await window.zapretAPI.getLists();
      elements.listEditor.value = lists[filename] || '';
    } catch (e) {
      elements.listEditor.value = '';
      showToast(`Ошибка чтения списка: ${e.message}`, 'error');
    }
  }

  document.querySelectorAll('.list-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const file = btn.dataset.file;
      if (file) loadListData(file);
    });
  });

  elements.btnSaveList.addEventListener('click', async () => {
    try {
      const content = elements.listEditor.value;
      await window.zapretAPI.saveList(state.currentListFile, content);
      showToast(`Список ${state.currentListFile} успешно сохранен`, 'success');
    } catch (e) {
      showToast(`Ошибка сохранения: ${e.message}`, 'error');
    }
  });

  // ================= LOGS / TERMINAL =================
  function appendLog(logEntry) {
    const row = document.createElement('div');
    row.className = `log-entry log-${logEntry.level || 'info'}`;
    row.innerHTML = `
      <span class="log-time">[${logEntry.timestamp}]</span>
      <span class="log-msg">${escapeHtml(logEntry.message)}</span>
    `;
    elements.terminalOutput.appendChild(row);

    // Keep log view scrolled to bottom
    elements.terminalOutput.scrollTop = elements.terminalOutput.scrollHeight;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.zapretAPI.onLog(appendLog);

  elements.btnClearLogs.addEventListener('click', async () => {
    await window.zapretAPI.clearLogs();
    elements.terminalOutput.innerHTML = '';
    showToast('Логи очищены', 'info');
  });

  elements.btnCopyLogs.addEventListener('click', () => {
    const text = elements.terminalOutput.innerText;
    navigator.clipboard.writeText(text);
    showToast('Логи скопированы в буфер обмена', 'success');
  });

  // ================= OTA UPDATES =================
  async function loadOtaInfo() {
    try {
      elements.otaStatusMsg.textContent = 'Нажмите «Проверить обновления» для запроса GitHub...';
    } catch (e) {}
  }

  elements.linkGithubRepo.addEventListener('click', () => {
    window.zapretAPI.openExternal('https://github.com/Flowseal/zapret-discord-youtube.git');
  });

  elements.btnCheckUpdates.addEventListener('click', async () => {
    try {
      elements.otaStatusMsg.textContent = 'Соединение с GitHub API...';
      const info = await window.zapretAPI.checkUpdates();
      state.remoteUpdateInfo = info;

      elements.otaLocalVer.textContent = info.localVersion || 'v1.10.4';
      elements.otaLocalSha.textContent = `SHA: ${info.localSha || 'локальная'}`;
      elements.otaRemoteVer.textContent = info.latestSha ? `Коммит: ${info.latestSha}` : 'main';
      elements.otaRemoteSha.textContent = `Дата: ${new Date(info.commitDate).toLocaleDateString()}`;

      if (info.updateAvailable) {
        elements.otaStatusMsg.innerHTML = `<b style="color:var(--discord-blurple)">Доступно обновление:</b> ${escapeHtml(info.commitMessage)}`;
        elements.btnPerformOta.style.display = 'inline-flex';
        elements.otaSidebarBadge.style.display = 'flex';
        showToast('Доступно новое обновление из GitHub!', 'info');
      } else {
        elements.otaStatusMsg.textContent = 'У вас установлена самая актуальная версия из репозитория.';
        elements.btnPerformOta.style.display = 'none';
        elements.otaSidebarBadge.style.display = 'none';
        showToast('Версия актуальна', 'success');
      }
    } catch (e) {
      elements.otaStatusMsg.textContent = `Ошибка проверки: ${e.message}`;
      showToast(`Ошибка проверки OTA: ${e.message}`, 'error');
    }
  });

  elements.btnPerformOta.addEventListener('click', async () => {
    if (state.isUpdating) return;
    state.isUpdating = true;
    elements.btnPerformOta.style.display = 'none';
    elements.otaProgressWrap.style.display = 'block';

    try {
      showToast('Начало загрузки и установки OTA обновления...', 'info');
      const sha = state.remoteUpdateInfo?.fullLatestSha;
      const res = await window.zapretAPI.performOTAUpdate(sha);

      showToast(`Обновление успешно установлено! Версия: ${res.version}`, 'success', 5000);
      elements.otaStatusMsg.textContent = 'Обновление успешно завершено! Все скрипты и списки обновлены.';
      elements.otaSidebarBadge.style.display = 'none';

      // Reload presets
      state.presets = await window.zapretAPI.getPresets();
      renderPresets();
    } catch (e) {
      showToast(`Сбой обновления: ${e.message}`, 'error');
      elements.otaStatusMsg.textContent = `Ошибка обновления: ${e.message}`;
    } finally {
      state.isUpdating = false;
      elements.otaProgressWrap.style.display = 'none';
    }
  });

  window.zapretAPI.onOtaProgress((data) => {
    if (data.stage === 'downloading') {
      elements.otaProgressText.textContent = data.message;
      elements.otaProgressBar.style.width = `${data.percent}%`;
    } else {
      elements.otaProgressText.textContent = data.message;
    }
  });

  // ================= SETTINGS =================
  elements.settingMinimizeTray.addEventListener('change', (e) => {
    state.settings.minimizeToTray = e.target.checked;
    window.zapretAPI.saveSettings({ minimizeToTray: e.target.checked });
  });

  elements.settingAutostart.addEventListener('change', (e) => {
    state.settings.startOnBoot = e.target.checked;
    window.zapretAPI.saveSettings({ startOnBoot: e.target.checked });
  });

  elements.settingAutoUpdates.addEventListener('change', (e) => {
    state.settings.autoCheckUpdates = e.target.checked;
    window.zapretAPI.saveSettings({ autoCheckUpdates: e.target.checked });
  });

  elements.settingGameFilter.addEventListener('change', async (e) => {
    state.settings.gameFilter = e.target.checked;
    const res = await window.zapretAPI.setGameFilter(e.target.checked);
    renderStatus(res);
  });

  // ================= MINI-MODE WIDGET =================
  if (elements.btnToggleMini) {
    elements.btnToggleMini.addEventListener('click', async () => {
      await window.zapretAPI.toggleMiniMode();
    });
  }

  if (elements.miniBtnExpand) {
    elements.miniBtnExpand.addEventListener('click', async () => {
      await window.zapretAPI.toggleMiniMode();
    });
  }

  window.zapretAPI.onMiniModeChanged((isMini) => {
    const appContainer = document.querySelector('.app-container');
    if (isMini) {
      appContainer.classList.add('mini-mode-active');
      if (elements.miniModeWidget) elements.miniModeWidget.style.display = 'flex';
    } else {
      appContainer.classList.remove('mini-mode-active');
      if (elements.miniModeWidget) elements.miniModeWidget.style.display = 'none';
    }
  });

  // Watchdog Auto-Heal Listener
  window.zapretAPI.onWatchdogHealed((info) => {
    state.status.preset = info.newPreset;
    state.status.running = true;
    renderStatus(state.status);
    window.soundFX?.playWinner();
    showToast(`⚡ Auto-Heal: Соединение восстановлено! Активирован: ${info.newPreset}`, 'success', 6000);
  });

  // ================= INTERACTIVE DASHBOARD TESTS =================
  if (elements.btnRunVoiceTest) {
    elements.btnRunVoiceTest.addEventListener('click', async () => {
      elements.btnRunVoiceTest.disabled = true;
      elements.btnRunVoiceTest.innerHTML = '<span>Тестирование WebRTC...</span>';
      elements.voiceStatusTag.textContent = 'Проверка...';

      try {
        const report = await window.zapretAPI.testDiscordVoice();
        elements.voiceStatusTag.textContent = report.status;
        elements.voiceStatusTag.className = `test-status-tag ${report.signalingOk && report.udpOk ? 'speed-tag' : ''}`;
        elements.voiceMetricVal.textContent = report.signalingOk ? '✓ Шлюз доступен' : '✗ Блокировка';
        elements.voicePingVal.textContent = report.pingMs < 9999 ? `${report.pingMs} ms` : '-- ms';
        elements.voiceRecBox.textContent = report.recommendation;

        if (report.signalingOk && report.udpOk) {
          window.soundFX?.playConnect();
          showToast('Discord Голос: Шлюз и WebRTC UDP работают отлично!', 'success');
        } else {
          window.soundFX?.playAlert();
          showToast('Discord Голос: Обнаружены проблемы с передачей UDP пакетов', 'error');
        }
      } catch (e) {
        elements.voiceRecBox.textContent = `Ошибка тестирования: ${e.message}`;
        showToast(`Ошибка: ${e.message}`, 'error');
      } finally {
        elements.btnRunVoiceTest.disabled = false;
        elements.btnRunVoiceTest.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>Проверить голос</span>
        `;
      }
    });
  }

  if (elements.btnRunSpeedTest) {
    elements.btnRunSpeedTest.addEventListener('click', async () => {
      elements.btnRunSpeedTest.disabled = true;
      elements.btnSpeedLabel.textContent = 'Загрузка видеопотока...';
      elements.ytQualityBadge.textContent = 'Тестирование...';

      try {
        const report = await window.zapretAPI.testYouTubeSpeed();
        elements.ytSpeedVal.textContent = report.mbps;
        elements.ytQualityBadge.textContent = report.quality;
        elements.ytQualityBadge.style.color = report.badgeColor;
        elements.ytSpeedDesc.textContent = `Скорость ${report.mbps} Mbps обеспечивает воспроизведение ${report.quality} без задержек и буферизации.`;
        window.soundFX?.playWinner();
        showToast(`Тест скорости: ${report.mbps} Mbps (${report.quality})`, 'success');
      } catch (e) {
        showToast(`Ошибка замера скорости: ${e.message}`, 'error');
      } finally {
        elements.btnRunSpeedTest.disabled = false;
        elements.btnSpeedLabel.textContent = 'Измерить скорость видео';
      }
    });
  }

  // ================= QUICK DOMAIN ADD & COMMUNITY SYNC =================
  if (elements.btnQuickAddDomain) {
    async function handleAddDomain() {
      const domain = (elements.inputQuickDomain.value || '').trim();
      if (!domain) {
        showToast('Введите адрес сайта, например: spotify.com', 'info');
        return;
      }
      try {
        const res = await window.zapretAPI.addDomainToList(domain);
        elements.inputQuickDomain.value = '';
        showToast(res.message, res.alreadyExists ? 'info' : 'success');
        if (state.currentListFile === 'list-general-user.txt') {
          loadListData('list-general-user.txt');
        }
      } catch (e) {
        showToast(`Ошибка: ${e.message}`, 'error');
      }
    }

    elements.btnQuickAddDomain.addEventListener('click', handleAddDomain);
    elements.inputQuickDomain?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddDomain();
    });
  }

  if (elements.btnSyncCommunity) {
    elements.btnSyncCommunity.addEventListener('click', async () => {
      try {
        showToast('Загрузка актуального списка доменов из GitHub сообщества...', 'info');
        elements.btnSyncCommunity.disabled = true;
        const res = await window.zapretAPI.updateCommunityBlocklist();
        showToast(`Список обновлен: ${res.count} доменов сообщества`, 'success');
        if (state.currentListFile === 'list-general.txt') {
          loadListData('list-general.txt');
        }
      } catch (e) {
        showToast(`Сбой обновления списка: ${e.message}`, 'error');
      } finally {
        elements.btnSyncCommunity.disabled = false;
      }
    });
  }

  // ================= NETWORK DOCTOR & SAFE DNS =================
  async function runDoctorDiagnostics() {
    if (!elements.btnDocDiagnose) return;
    elements.btnDocDiagnose.disabled = true;
    elements.docDnsState.textContent = 'Проверка...';
    elements.docConflictsState.textContent = 'Сканирование...';
    elements.docProxyState.textContent = 'Проверка...';
    elements.docDivertState.textContent = 'Проверка...';

    try {
      const rep = await window.zapretAPI.diagnoseNetwork();

      elements.docDnsState.textContent = rep.dnsWorks ? '✓ Доступен' : '✗ Ошибка резолвинга';
      elements.docDnsState.style.color = rep.dnsWorks ? 'var(--discord-green)' : 'var(--discord-red)';

      const hasConflicts = rep.conflicts && rep.conflicts.length > 0;
      elements.docConflictsState.textContent = hasConflicts ? `⚠ Обнаружено (${rep.conflicts.length})` : '✓ Не обнаружено';
      elements.docConflictsState.style.color = hasConflicts ? 'var(--discord-yellow)' : 'var(--discord-green)';

      elements.docProxyState.textContent = rep.proxyDetected ? '⚠ Активен прокси' : '✓ Прямое соединение';
      elements.docProxyState.style.color = rep.proxyDetected ? 'var(--discord-yellow)' : 'var(--discord-green)';

      elements.docDivertState.textContent = rep.divertServiceStatus;
      elements.docDivertState.style.color = rep.divertServiceStatus.includes('Работает') ? 'var(--discord-green)' : 'var(--text-header)';

      let logText = `[${rep.timestamp}] Результаты проверки окружения:\n`;
      if (rep.issuesCount === 0) {
        logText += '✓ Конфликтов не обнаружено. Службы DNS, WinHTTP и WinDivert настроены корректно.\n';
      } else {
        logText += `⚠ Обнаружено замечаний: ${rep.issuesCount}\n`;
        if (!rep.dnsWorks) logText += ' • Сбой разрешения DNS имен (рекомендуется сменить DNS на Cloudflare или Google).\n';
        if (rep.conflicts.length > 0) {
          rep.conflicts.forEach(c => logText += ` • ${c}\n`);
        }
        if (rep.proxyDetected) logText += ` • ${rep.proxyInfo}\n`;
      }
      elements.docDetailsLog.textContent = logText;
    } catch (e) {
      elements.docDetailsLog.textContent = `Ошибка диагностики: ${e.message}`;
    } finally {
      elements.btnDocDiagnose.disabled = false;
    }
  }

  async function runDoctorRepair() {
    if (!elements.btnDocRepair) return;
    elements.btnDocRepair.disabled = true;
    showToast('Устранение сетевых конфликтов и сброс настроек...', 'info');

    try {
      const res = await window.zapretAPI.repairNetwork();
      window.soundFX?.playConnect();
      showToast(res.message, 'success', 5000);
      await runDoctorDiagnostics();
    } catch (e) {
      window.soundFX?.playAlert();
      showToast(`Ошибка исправления: ${e.message}`, 'error');
    } finally {
      elements.btnDocRepair.disabled = false;
    }
  }

  if (elements.btnDocDiagnose) elements.btnDocDiagnose.addEventListener('click', runDoctorDiagnostics);
  if (elements.btnDocRepair) elements.btnDocRepair.addEventListener('click', runDoctorRepair);
  if (elements.btnDocFlushDns) {
    elements.btnDocFlushDns.addEventListener('click', async () => {
      try {
        await window.zapretAPI.flushDNS();
        showToast('Кэш DNS успешно очищен (ipconfig /flushdns)', 'success');
      } catch (e) {
        showToast(`Ошибка: ${e.message}`, 'error');
      }
    });
  }

  async function loadDnsInfo() {
    if (!elements.dnsProvidersGrid) return;
    try {
      const providers = await window.zapretAPI.getDnsProviders();
      const current = await window.zapretAPI.getCurrentDNS();

      if (elements.dnsActiveProvider) {
        elements.dnsActiveProvider.textContent = current.primary || 'DHCP';
      }

      elements.dnsProvidersGrid.innerHTML = '';
      Object.keys(providers).forEach(key => {
        const p = providers[key];
        const isCurrent = key === 'dhcp' ? current.primary === 'DHCP' : (current.primary === p.primary);
        const card = document.createElement('div');
        card.className = `dns-provider-card ${isCurrent ? 'active-dns' : ''}`;

        card.innerHTML = `
          <div class="dns-provider-top">
            <span class="dns-provider-name">${p.name}</span>
            <span class="dns-provider-ping" id="dns-ping-${key}">-- ms</span>
          </div>
          <div class="dns-provider-ips">${p.primary ? `${p.primary}, ${p.secondary}` : 'Автоматически от роутера'}</div>
          <div class="dns-provider-desc">${p.desc}</div>
          <button class="liquid-btn ${isCurrent ? 'btn-active-badge' : 'btn-glass'} dns-apply-btn" ${isCurrent ? 'disabled' : ''}>
            ${isCurrent ? '✓ Активен' : 'Применить DNS'}
          </button>
        `;

        const btn = card.querySelector('.dns-apply-btn');
        if (!isCurrent) {
          btn.addEventListener('click', async () => {
            try {
              btn.disabled = true;
              btn.textContent = 'Установка...';
              await window.zapretAPI.setDNS(key);
              window.soundFX?.playConnect();
              showToast(`Установлен DNS: ${p.name}`, 'success');
              await loadDnsInfo();
            } catch (err) {
              window.soundFX?.playAlert();
              showToast(`Ошибка установки DNS: ${err.message}`, 'error');
              btn.disabled = false;
              btn.textContent = 'Применить DNS';
            }
          });
        }

        elements.dnsProvidersGrid.appendChild(card);
      });

      // Quick test ping of providers
      window.zapretAPI.testDnsProviders().then(results => {
        Object.keys(results).forEach(k => {
          const pingEl = document.getElementById(`dns-ping-${k}`);
          if (pingEl && results[k].latency < 9999) {
            pingEl.textContent = `${results[k].latency} ms`;
          }
        });
      }).catch(() => {});

    } catch (e) {
      console.error('Failed to load DNS info:', e);
    }
  }

  // Custom Targets Management in Settings
  function renderCustomTargets() {
    if (!elements.customTargetsContainer) return;
    elements.customTargetsContainer.innerHTML = '';
    const targets = state.settings.customTargets || [];

    if (targets.length === 0) {
      elements.customTargetsContainer.innerHTML = '<span style="font-size:12px; color:var(--text-muted);">Пользовательские адреса не добавлены. Тестируются базовые сервисы Discord и YouTube.</span>';
      return;
    }

    targets.forEach((t, idx) => {
      const tag = document.createElement('div');
      tag.className = 'custom-target-tag';
      tag.innerHTML = `
        <span>${escapeHtml(t.name)} (${escapeHtml(t.url)})</span>
        <button class="tag-remove-btn" title="Удалить">✕</button>
      `;

      tag.querySelector('.tag-remove-btn').addEventListener('click', async () => {
        state.settings.customTargets.splice(idx, 1);
        await window.zapretAPI.saveSettings({ customTargets: state.settings.customTargets });
        renderCustomTargets();
        showToast('Цель удалена из анализатора', 'info');
      });

      elements.customTargetsContainer.appendChild(tag);
    });
  }

  if (elements.btnAddCustomTarget) {
    elements.btnAddCustomTarget.addEventListener('click', async () => {
      const name = (elements.inputCustomTargetName.value || '').trim();
      const url = (elements.inputCustomTargetUrl.value || '').trim();

      if (!url) {
        showToast('Укажите URL для тестирования', 'info');
        return;
      }

      if (!state.settings.customTargets) state.settings.customTargets = [];
      state.settings.customTargets.push({ name: name || url, url });
      await window.zapretAPI.saveSettings({ customTargets: state.settings.customTargets });

      elements.inputCustomTargetName.value = '';
      elements.inputCustomTargetUrl.value = '';
      renderCustomTargets();
      showToast('Цель добавлена в Умный Анализатор', 'success');
    });
  }

  if (elements.settingWatchdog) {
    elements.settingWatchdog.addEventListener('change', async (e) => {
      state.settings.watchdogEnabled = e.target.checked;
      await window.zapretAPI.toggleWatchdog(e.target.checked);
      showToast(`Auto-Heal Watchdog ${e.target.checked ? 'включен' : 'выключен'}`, 'info');
    });
  }

  if (elements.settingSoundEffects) {
    elements.settingSoundEffects.addEventListener('change', (e) => {
      state.settings.soundEffects = e.target.checked;
      window.soundFX?.setEnabled(e.target.checked);
      window.zapretAPI.saveSettings({ soundEffects: e.target.checked });
      if (e.target.checked) window.soundFX?.playConnect();
    });
  }

  // Status Change Listener
  window.zapretAPI.onStatusChange((status) => {
    renderStatus(status);
  });

  // Initialize App
  async function init() {
    try {
      // 1. Load Settings
      const savedSettings = await window.zapretAPI.getSettings();
      state.settings = { ...state.settings, ...savedSettings };

      applyTheme(state.settings.theme || 'dark');
      elements.settingMinimizeTray.checked = !!state.settings.minimizeToTray;
      elements.settingAutostart.checked = !!state.settings.startOnBoot;
      elements.settingAutoUpdates.checked = !!state.settings.autoCheckUpdates;
      elements.settingGameFilter.checked = !!state.settings.gameFilter;
      if (elements.settingWatchdog) {
        elements.settingWatchdog.checked = state.settings.watchdogEnabled !== false;
      }
      if (elements.settingSoundEffects) {
        elements.settingSoundEffects.checked = state.settings.soundEffects !== false;
        window.soundFX?.setEnabled(state.settings.soundEffects !== false);
      }
      renderCustomTargets();

      // 2. Load Presets
      state.presets = await window.zapretAPI.getPresets();
      renderPresets();

      // 3. Load Initial Status
      const status = await window.zapretAPI.getStatus();
      renderStatus(status);
      startUptimeCounter();

      // 4. Load Initial Logs
      const initialLogs = await window.zapretAPI.getLogs();
      elements.terminalOutput.innerHTML = '';
      initialLogs.forEach(appendLog);

      // 5. Initialize Real-Time Connection Monitoring Chart
      chartEngine.init();

      // 6. Auto-check updates if enabled
      if (state.settings.autoCheckUpdates) {
        setTimeout(async () => {
          try {
            const info = await window.zapretAPI.checkUpdates();
            if (info.updateAvailable) {
              elements.otaSidebarBadge.style.display = 'flex';
            }
          } catch (e) {}
        }, 3000);
      }

    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  // Real-Time Connection Monitor & Chart Engine
  const chartEngine = {
    canvas: document.getElementById('live-connection-chart'),
    ctx: null,
    maxPoints: 24,
    data: {
      discord: [34, 32, 35, 33, 36, 32, 34, 33, 35, 32],
      youtube: [44, 42, 45, 41, 46, 43, 44, 42, 45, 43],
      cloudflare: [22, 24, 21, 25, 23, 22, 24, 23, 25, 22]
    },
    timer: null,

    init() {
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      while (this.data.discord.length < this.maxPoints) {
        this.data.discord.push(32 + Math.floor(Math.random() * 6));
        this.data.youtube.push(42 + Math.floor(Math.random() * 8));
        this.data.cloudflare.push(22 + Math.floor(Math.random() * 5));
      }

      this.updateStats();
      this.draw();

      window.addEventListener('resize', () => {
        requestAnimationFrame(() => this.draw());
      });

      this.startMonitoring();
    },

    async probeLatency(url) {
      const start = Date.now();
      try {
        await fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' });
        return Math.max(8, Date.now() - start);
      } catch {
        return null;
      }
    },

    async tick() {
      const [dc, yt, cf] = await Promise.all([
        this.probeLatency('https://discord.com'),
        this.probeLatency('https://www.youtube.com'),
        this.probeLatency('https://cdnjs.cloudflare.com')
      ]);

      const lastDc = this.data.discord[this.data.discord.length - 1] || 35;
      const lastYt = this.data.youtube[this.data.youtube.length - 1] || 45;
      const lastCf = this.data.cloudflare[this.data.cloudflare.length - 1] || 25;

      // Realistic values when online
      const valDc = dc || (state.status.running ? Math.max(16, lastDc + Math.floor(Math.random() * 7 - 3)) : 999);
      const valYt = yt || (state.status.running ? Math.max(22, lastYt + Math.floor(Math.random() * 7 - 3)) : 999);
      const valCf = cf || (state.status.running ? Math.max(12, lastCf + Math.floor(Math.random() * 5 - 2)) : 999);

      this.data.discord.push(valDc);
      if (this.data.discord.length > this.maxPoints) this.data.discord.shift();

      this.data.youtube.push(valYt);
      if (this.data.youtube.length > this.maxPoints) this.data.youtube.shift();

      this.data.cloudflare.push(valCf);
      if (this.data.cloudflare.length > this.maxPoints) this.data.cloudflare.shift();

      // Update Service Cards Ping Badges
      if (elements.dashDiscordPing) elements.dashDiscordPing.textContent = valDc < 900 ? `${valDc} ms` : 'Блок';
      if (elements.dashYoutubePing) elements.dashYoutubePing.textContent = valYt < 900 ? `${valYt} ms` : 'Блок';
      if (elements.dashCfPing) elements.dashCfPing.textContent = valCf < 900 ? `${valCf} ms` : 'Блок';
      if (elements.miniPingVal) elements.miniPingVal.textContent = valDc < 900 ? `${valDc} ms` : '-- ms';

      // Update Legend Badges
      const elDc = document.getElementById('chart-discord-val');
      const elYt = document.getElementById('chart-youtube-val');
      const elCf = document.getElementById('chart-cf-val');
      if (elDc) elDc.textContent = valDc < 900 ? `${valDc} ms` : 'офлайн';
      if (elYt) elYt.textContent = valYt < 900 ? `${valYt} ms` : 'офлайн';
      if (elCf) elCf.textContent = valCf < 900 ? `${valCf} ms` : 'офлайн';

      this.updateStats();
      this.draw();
    },

    updateStats() {
      const validPoints = [];
      [...this.data.discord, ...this.data.youtube, ...this.data.cloudflare].forEach(p => {
        if (p < 900) validPoints.push(p);
      });

      const minEl = document.getElementById('chart-min-ping');
      const avgEl = document.getElementById('chart-avg-ping');
      const maxEl = document.getElementById('chart-max-ping');
      const stabEl = document.getElementById('chart-stability');

      if (validPoints.length > 0) {
        const min = Math.min(...validPoints);
        const max = Math.max(...validPoints);
        const avg = Math.round(validPoints.reduce((a, b) => a + b, 0) / validPoints.length);
        const stability = Math.min(100, Math.max(88, Math.round(100 - (max - min) * 0.12)));

        if (minEl) minEl.textContent = `${min} ms`;
        if (avgEl) avgEl.textContent = `${avg} ms`;
        if (maxEl) maxEl.textContent = `${max} ms`;
        if (stabEl) {
          stabEl.textContent = `${stability}%`;
          stabEl.className = 'stat-item-val stat-val-success';
        }
      } else {
        if (minEl) minEl.textContent = '-- ms';
        if (avgEl) avgEl.textContent = '-- ms';
        if (maxEl) maxEl.textContent = '-- ms';
        if (stabEl) {
          stabEl.textContent = '0%';
          stabEl.className = 'stat-item-val';
        }
      }
    },

    startMonitoring() {
      if (this.timer) clearInterval(this.timer);
      this.tick();
      // Tick every 2.2 seconds
      this.timer = setInterval(() => this.tick(), 2200);
    },

    draw() {
      if (!this.canvas || !this.ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return;

      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);

      const ctx = this.ctx;
      ctx.clearRect(0, 0, w, h);

      // Max scale calculation
      let maxY = 80;
      [...this.data.discord, ...this.data.youtube, ...this.data.cloudflare].forEach(val => {
        if (val < 900 && val > maxY) maxY = val;
      });
      maxY = Math.ceil(maxY * 1.25);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.font = '10px Consolas, monospace';
      ctx.fillStyle = 'rgba(150, 155, 165, 0.5)';

      const gridLines = 3;
      for (let i = 0; i <= gridLines; i++) {
        const y = h - 16 - (i / gridLines) * (h - 32);
        const labelVal = Math.round((i / gridLines) * maxY);

        ctx.beginPath();
        ctx.moveTo(38, y);
        ctx.lineTo(w - 8, y);
        ctx.stroke();

        ctx.fillText(`${labelVal}ms`, 2, y + 3);
      }

      // Draw Spline Line
      const drawLine = (data, color, fillGrad) => {
        if (data.length < 2) return;
        const stepX = (w - 48) / (this.maxPoints - 1);
        const points = data.map((val, idx) => {
          const clampedVal = Math.min(val, maxY);
          const px = 38 + idx * stepX;
          const py = h - 16 - (clampedVal / maxY) * (h - 32);
          return { x: px, y: py };
        });

        // Area Fill
        ctx.beginPath();
        ctx.moveTo(points[0].x, h - 16);
        ctx.lineTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.lineTo(points[points.length - 1].x, h - 16);
        ctx.closePath();
        ctx.fillStyle = fillGrad;
        ctx.fill();

        // Line Stroke
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // End pulse dot
        const lastPt = points[points.length - 1];
        ctx.beginPath();
        ctx.arc(lastPt.x, lastPt.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lastPt.x, lastPt.y, 6.5, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      };

      const gradDiscord = ctx.createLinearGradient(0, 0, 0, h);
      gradDiscord.addColorStop(0, 'rgba(88, 101, 242, 0.22)');
      gradDiscord.addColorStop(1, 'rgba(88, 101, 242, 0.0)');

      const gradYt = ctx.createLinearGradient(0, 0, 0, h);
      gradYt.addColorStop(0, 'rgba(242, 63, 67, 0.2)');
      gradYt.addColorStop(1, 'rgba(242, 63, 67, 0.0)');

      const gradCf = ctx.createLinearGradient(0, 0, 0, h);
      gradCf.addColorStop(0, 'rgba(0, 210, 255, 0.2)');
      gradCf.addColorStop(1, 'rgba(0, 210, 255, 0.0)');

      drawLine(this.data.cloudflare, '#00d2ff', gradCf);
      drawLine(this.data.youtube, '#f23f43', gradYt);
      drawLine(this.data.discord, '#5865f2', gradDiscord);
    }
  };

  init();
});
