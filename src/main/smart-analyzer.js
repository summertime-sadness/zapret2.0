const https = require('https');
const http = require('http');
const EventEmitter = require('events');

class SmartAnalyzer extends EventEmitter {
  constructor(zapretManager) {
    super();
    this.manager = zapretManager;
    this.isAnalyzing = false;
    this.shouldAbort = false;

    // Endpoints representative of Discord and YouTube censorship bypass
    this.baseTargets = [
      { name: 'Discord', key: 'discord', url: 'https://discord.com', category: 'discord' },
      { name: 'Discord Gateway', key: 'discordGateway', url: 'https://gateway.discord.gg', category: 'discord' },
      { name: 'Discord CDN', key: 'discordCdn', url: 'https://cdn.discordapp.com', category: 'discord' },
      { name: 'YouTube', key: 'youtube', url: 'https://www.youtube.com', category: 'youtube' },
      { name: 'YouTube Media', key: 'youtubeMedia', url: 'https://i.ytimg.com/generate_204', category: 'youtube' },
      { name: 'Cloudflare', key: 'cloudflare', url: 'https://cdnjs.cloudflare.com', category: 'cdn' }
    ];
    this.customTargets = [];
    this.updateTargetList();
  }

  setCustomTargets(list = []) {
    this.customTargets = (list || []).filter(item => item && item.url).map((item, idx) => ({
      name: item.name || `Пользовательский #${idx + 1}`,
      key: `custom_${idx}_${(item.name || '').replace(/[^a-z0-9]/gi, '')}`,
      url: item.url.startsWith('http') ? item.url : `https://${item.url}`,
      category: 'custom'
    }));
    this.updateTargetList();
  }

  updateTargetList() {
    this.targets = [...this.baseTargets, ...this.customTargets];
  }

  abort() {
    if (this.isAnalyzing) {
      this.shouldAbort = true;
      this.manager.addLog('info', 'Отмена анализа пользователем...');
      this.emit('progress', { stage: 'cancelled', message: 'Анализ отменен' });
    }
  }

  // Probe a single endpoint via HTTPS
  checkEndpoint(url, timeoutMs = 2400) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let finished = false;

      const finish = (ok, status = 0, error = null) => {
        if (finished) return;
        finished = true;
        const latency = Date.now() - startTime;
        resolve({
          ok,
          latency: ok ? latency : 9999,
          status,
          error: error ? error.message : null
        });
      };

      try {
        const u = new URL(url);
        const req = https.request({
          hostname: u.hostname,
          port: u.port || 443,
          path: u.pathname + (u.search || ''),
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept': '*/*'
          },
          rejectUnauthorized: false,
          timeout: timeoutMs
        }, (res) => {
          // If we received any HTTP response headers (even 403/404/301), TLS handshake succeeded and packet bypass works!
          finish(true, res.statusCode);
        });

        req.on('timeout', () => {
          req.destroy(new Error('Timeout'));
          finish(false, 0, new Error('Timeout'));
        });

        req.on('error', (err) => {
          // If error is ECONNRESET, ETIMEDOUT, etc. -> blocked
          finish(false, 0, err);
        });

        req.end();
      } catch (err) {
        finish(false, 0, err);
      }
    });
  }

  // Test current running configuration against all targets
  async testAllTargets() {
    const results = {};
    const promises = this.targets.map(async (target) => {
      const res = await this.checkEndpoint(target.url);
      results[target.key] = {
        name: target.name,
        category: target.category,
        ok: res.ok,
        latency: res.latency,
        status: res.status
      };
    });

    await Promise.all(promises);

    let okCount = 0;
    let totalLatency = 0;
    for (const key of Object.keys(results)) {
      if (results[key].ok) {
        okCount++;
        totalLatency += results[key].latency;
      }
    }

    const total = this.targets.length;
    const successRate = Math.round((okCount / total) * 100);
    const avgLatency = okCount > 0 ? Math.round(totalLatency / okCount) : 9999;

    // Discord specific check
    const discordOk = results.discord?.ok && results.discordGateway?.ok;
    // YouTube specific check
    const youtubeOk = results.youtube?.ok && results.youtubeMedia?.ok;

    // Score calculation (0 to 100)
    // 70% based on success rate, 30% based on latency speed
    let latencyScore = 0;
    if (avgLatency < 100) latencyScore = 30;
    else if (avgLatency < 250) latencyScore = 25;
    else if (avgLatency < 500) latencyScore = 20;
    else if (avgLatency < 1000) latencyScore = 15;
    else if (avgLatency < 2000) latencyScore = 10;
    else latencyScore = 5;

    const baseScore = Math.round((successRate / 100) * 70);
    const totalScore = okCount === 0 ? 0 : baseScore + latencyScore;

    return {
      successRate,
      okCount,
      total,
      avgLatency,
      discordOk,
      youtubeOk,
      score: totalScore,
      details: results
    };
  }

  async runAnalysis(candidatePresets = null) {
    if (this.isAnalyzing) {
      throw new Error('Анализ уже запущен');
    }

    if (!this.manager.isElevated()) {
      const errMsg = 'Для работы анализатора и автоматического переключения конфигураций требуются права Администратора! Нажмите кнопку «Перезапустить от Администратора» вверху окна.';
      this.manager.addLog('warn', `[Smart Analyzer] ${errMsg}`);
      this.emit('progress', {
        stage: 'error',
        error: errMsg,
        message: errMsg
      });
      throw new Error(errMsg);
    }

    this.isAnalyzing = true;
    this.shouldAbort = false;
    const previousRunning = this.manager.isRunning();
    const previousPreset = this.manager.currentPreset;

    const allPresets = this.manager.getPresets();
    // Candidate list prioritizing highest probability working configs first, but testing ALL strategies
    let toTest = candidatePresets;
    if (!toTest || toTest.length === 0) {
      const priorityOrder = [
        'general (ALT11).bat',
        'general (FAKE TLS AUTO).bat',
        'general (FAKE TLS AUTO ALT).bat',
        'general.bat',
        'general (ALT).bat',
        'general (ALT2).bat',
        'general (ALT3).bat',
        'general (ALT4).bat',
        'general (ALT5).bat',
        'general (ALT6).bat',
        'general (ALT7).bat',
        'general (ALT8).bat',
        'general (ALT9).bat',
        'general (ALT10).bat',
        'general (ALT12).bat',
        'general (ALT13).bat',
        'general (EXP).bat',
        'general (FAKE TLS AUTO ALT2).bat',
        'general (FAKE TLS AUTO ALT3).bat',
        'general (SIMPLE FAKE).bat',
        'general (SIMPLE FAKE ALT).bat',
        'general (SIMPLE FAKE ALT2).bat'
      ];

      toTest = [];
      // Add prioritized ones that exist
      for (const name of priorityOrder) {
        const found = allPresets.find(p => p.filename.toLowerCase() === name.toLowerCase());
        if (found && !toTest.includes(found.filename)) toTest.push(found.filename);
      }
      // Add all remaining presets without omission
      for (const p of allPresets) {
        if (!toTest.includes(p.filename)) {
          toTest.push(p.filename);
        }
      }
    }

    this.emit('progress', {
      stage: 'started',
      totalConfigs: toTest.length,
      configs: toTest,
      message: `Начало оптимизации: тестирование всех ${toTest.length} конфигураций...`
    });

    const configScores = [];

    try {
      for (let i = 0; i < toTest.length; i++) {
        if (this.shouldAbort) break;

        const preset = toTest[i];
        this.emit('progress', {
          stage: 'testing_config',
          currentIndex: i + 1,
          totalConfigs: toTest.length,
          preset,
          message: `Тестирование [${i + 1}/${toTest.length}]: ${preset}...`
        });

        this.manager.addLog('info', `[Smart Analyzer] Тестирование стратегии [${i + 1}/${toTest.length}]: ${preset}`);

        try {
          // 1. Start config
          await this.manager.start(preset);
          // Wait 750ms for WinDivert driver initialization
          await new Promise(r => setTimeout(r, 750));

          if (this.shouldAbort) break;

          // 2. Test endpoints
          const stats = await this.testAllTargets();

          const resultItem = {
            preset,
            successRate: stats.successRate,
            avgLatency: stats.avgLatency,
            score: stats.score,
            discordOk: stats.discordOk,
            youtubeOk: stats.youtubeOk,
            details: stats.details
          };

          configScores.push(resultItem);

          this.emit('progress', {
            stage: 'config_finished',
            currentIndex: i + 1,
            totalConfigs: toTest.length,
            result: resultItem,
            message: `${preset} -> Доступность: ${stats.successRate}%, Пинг: ${stats.avgLatency}ms (Счет: ${stats.score})`
          });

        } catch (err) {
          this.manager.addLog('warn', `[Smart Analyzer] Ошибка при тестировании ${preset}: ${err.message}`);
          configScores.push({
            preset,
            successRate: 0,
            avgLatency: 9999,
            score: 0,
            discordOk: false,
            youtubeOk: false,
            details: {}
          });
        }
      }

      // Sort by score descending, then by avgLatency ascending
      configScores.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.avgLatency - b.avgLatency;
      });

      let winner = null;
      if (configScores.length > 0 && configScores[0].score > 0) {
        winner = configScores[0];
      } else if (configScores.length > 0) {
        // Fallback to first
        winner = configScores[0];
      }

      if (winner && !this.shouldAbort) {
        this.manager.addLog('success', `[Smart Analyzer] Автоматический выбор победителя: ${winner.preset} (Счет: ${winner.score}/100, Пинг: ${winner.avgLatency}ms)`);
        
        let startOk = false;
        try {
          await this.manager.start(winner.preset);
          startOk = true;
        } catch (e) {
          this.manager.addLog('warn', `[Smart Analyzer] Предупреждение при старте ${winner.preset}: ${e.message}`);
        }

        const summary = {
          winner: winner.preset,
          winnerScore: winner.score,
          winnerLatency: winner.avgLatency,
          winnerSuccessRate: winner.successRate,
          discordOk: winner.discordOk,
          youtubeOk: winner.youtubeOk,
          scores: configScores,
          applied: startOk
        };

        this.emit('progress', {
          stage: 'completed',
          summary,
          message: `Оптимизация завершена! Применена лучшая стратегия: ${winner.preset}`
        });

        return summary;
      } else {
        // Restore previous state if aborted or no winner
        if (previousRunning && previousPreset) {
          await this.manager.start(previousPreset);
        } else {
          await this.manager.stop();
        }

        const summary = {
          winner: null,
          scores: configScores,
          applied: false
        };

        this.emit('progress', {
          stage: 'completed',
          summary,
          message: 'Анализ завершен без автоматического применения'
        });

        return summary;
      }

    } finally {
      this.isAnalyzing = false;
      this.shouldAbort = false;
    }
  }
}

module.exports = SmartAnalyzer;
